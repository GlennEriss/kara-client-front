# Supprimer un contrat – Caisse Spéciale V2

> Documentation de la fonctionnalité **Supprimer un contrat** sur la page des contrats Caisse Spéciale (`/caisse-speciale`).  
> **Statut :** documentation uniquement (implémentation à faire après validation de cette spec).

---

## 1. Objectif

- Permettre à l’administrateur de **supprimer définitivement** un contrat Caisse Spéciale.
- La suppression est **irréversible** et **réservée aux contrats sans activité** (aucun versement enregistré, aucun remboursement, statut autorisé).

---

## 2. Règles métier

### 2.1 Quand peut-on supprimer ?

| Condition | Détail |
|---|---|
| Statut | **`DRAFT` ou `ACTIVE` uniquement** |
| Versements | **Aucune contribution enregistrée** : tous les paiements sont `DUE`, **sans** `contribs` ni `groupContributions` et **sans** `paidAt`. |
| Montants | **`nominalPaid === 0`** et **`penaltiesTotal === 0`** |
| Remboursements | **Aucun remboursement** : sous‑collection `refunds` vide |

> Si une seule condition échoue, la suppression est **refusée** côté service avec un message explicite.

### 2.2 Quand est-ce interdit ?

- Statuts **`LATE_*`**, **`DEFAULTED_AFTER_J12`**, **`EARLY_*`**, **`FINAL_REFUND_PENDING`**, **`RESCINDED`**, **`CLOSED`** → suppression interdite.
- Présence de **contributions** ou **paiements effectués** → suppression interdite.
- **Contrat issu d’une demande** mais **demande introuvable** → suppression interdite (intégrité des données).

### 2.3 Effets de la suppression

- Le document Firestore **`caisseContracts/{contractId}`** est supprimé.
- Les sous‑collections **`payments`** (même si DUE) et **`refunds`** sont supprimées.
- Le PDF du contrat (champ `contractPdf.path`) est supprimé dans Storage.
- Si le contrat provient d’une demande, la **demande est réactivée** (voir § 2.4).
- Le lien **contrat ↔ membre/groupe** est retiré (`caisseContractIds`).

### 2.4 Contrat issu d’une demande : mise à jour obligatoire

Si une **demande** possède `contractId === contractId` :

- **`status: 'APPROVED'`**
- **`contractId: null`** (ou suppression du champ)
- **`updatedBy`**, **`updatedAt`**

> Cette étape est **obligatoire** pour permettre la recréation d’un contrat depuis la demande.

### 2.5 Nettoyage Storage (obligatoire)

- Si `contract.contractPdf?.path` est défini → supprimer le fichier Storage via `deleteFile(path)`.
- Si `contract.contractPdf` est absent → aucun cleanup Storage.

> En cas d’échec de suppression du fichier, **logguer l’erreur et continuer** (best effort).

---

## 3. Parcours utilisateur

1. **Page** : `/caisse-speciale` (liste des contrats).
2. **Bouton “Supprimer”** visible **uniquement** si le contrat est éligible (règles § 2.1).
   - Carte (grille) : bouton rouge “Supprimer”.
   - Liste : entrée “Supprimer” dans le menu actions.
3. **Clic sur “Supprimer”** → ouverture d’un **modal de confirmation** (`DeleteCaisseSpecialeContractModal`).
4. **Modal** : message d’avertissement + bouton **“Supprimer”** (destructive).
5. **Après confirmation** : `deleteCaisseContract(contractId, adminId)` → nettoyage Storage + sub‑collections → update demande si besoin → suppression contrat → toast succès → refresh queries.

---

## 4. Architecture technique (domains)

L’implémentation suit l’architecture **domains**.  
Le code métier (service, hooks) vit sous `src/domains/financial/caisse-speciale/contrats/`.  
Les composants UI restent dans `src/components/caisse-speciale` et **importent les hooks du domaine**.

### 4.1 Chemins (domains)

| Rôle | Chemin |
|---|---|
| Service (métier) | `src/domains/financial/caisse-speciale/contrats/services/CaisseContractsService.ts` |
| Repository contrats | `src/domains/financial/caisse-speciale/contrats/repositories/CaisseContractsRepository.ts` |
| Repository demandes (domain) | `src/domains/financial/caisse-speciale/demandes/repositories/CaisseSpecialeDemandRepository.ts` (à créer) |
| Storage utils | `src/db/upload-image.db.ts` (`deleteFile`) |
| Payments/refunds | `src/db/caisse/payments.db.ts`, `src/db/caisse/refunds.db.ts` |
| Hook mutations | `src/domains/financial/caisse-speciale/contrats/hooks/useCaisseContracts.ts` (ajout mutation delete) |
| UI liste | `src/components/caisse-speciale/ListContracts.tsx` |
| UI modal | `src/components/caisse-speciale/DeleteCaisseSpecialeContractModal.tsx` (à créer) |

**Note :** le repository demandes domain peut **wrapper** le legacy `src/repositories/caisse-speciale/CaisseSpecialeDemandRepository.ts` si besoin.

### 4.2 Service : `deleteCaisseContract` (pseudo‑code)

```ts
async deleteCaisseContract(contractId: string, adminId: string): Promise<void> {
  const contract = await this.contractRepository.getContractById(contractId)
  if (!contract) throw new Error('Contrat introuvable')

  const allowedStatuses = ['DRAFT', 'ACTIVE']
  if (!allowedStatuses.includes(contract.status)) {
    throw new Error('Seuls les contrats DRAFT/ACTIVE sans activité peuvent être supprimés')
  }

  if (contract.nominalPaid > 0 || contract.penaltiesTotal > 0) {
    throw new Error('Impossible de supprimer un contrat avec versements/pénalités')
  }

  const payments = await listPayments(contractId)
  const hasContribs = payments.some((p: any) =>
    (p.status && p.status !== 'DUE') ||
    (Array.isArray(p.contribs) && p.contribs.length > 0) ||
    (Array.isArray(p.groupContributions) && p.groupContributions.length > 0) ||
    p.paidAt
  )
  if (hasContribs) throw new Error('Impossible de supprimer un contrat avec contributions')

  const refunds = await listRefunds(contractId)
  if (refunds.length > 0) throw new Error('Impossible de supprimer un contrat avec remboursements')

  // 1) Réactiver la demande si elle existe
  const demand = await this.demandRepository.getByContractId(contractId)
  if (demand) {
    await this.demandRepository.update(demand.id, {
      status: 'APPROVED',
      contractId: null,
    }, adminId)
  }

  // 2) Nettoyage Storage (PDF contrat)
  if (contract.contractPdf?.path) {
    try {
      await deleteFile(contract.contractPdf.path)
    } catch (err) {
      console.error('Erreur suppression PDF contrat:', err)
    }
  }

  // 3) Supprimer sous-collections (payments/refunds)
  await this.contractRepository.deletePayments(contractId)
  await this.contractRepository.deleteRefunds(contractId)

  // 4) Retirer le contrat du membre/groupe
  if (contract.memberId) await this.membersRepository.removeCaisseContract(contract.memberId, contractId)
  if (contract.groupeId) await this.groupsRepository.removeCaisseContract(contract.groupeId, contractId)

  // 5) Supprimer le contrat
  await this.contractRepository.deleteContract(contractId)
}
```

### 4.3 Firestore

- `caisseContracts` : `allow delete: if isAdmin()` (déjà présent). Aucun changement requis.
- Les règles `caisseSpecialeDemands` doivent autoriser `update` par admin (déjà le cas).

### 4.4 Cloud Function

**Non nécessaire.** L’action est admin‑only et peut rester côté service.

---

## 5. Liste des tâches

- [ ] Ajouter `deleteContract(contractId)` + `deletePayments(contractId)` + `deleteRefunds(contractId)` dans `CaisseContractsRepository`.
- [ ] Ajouter `getByContractId(contractId)` dans le repository demandes (domain).
- [ ] Implémenter `deleteCaisseContract(contractId, adminId)` dans `CaisseContractsService`.
- [ ] Ajouter `removeCaisseContract` dans les repositories membres/groupes.
- [ ] Ajouter la mutation `deleteContract` dans `useCaisseContracts` + invalidations (`caisse-contracts`, `caisse-contracts-stats`, `caisse-contract`).
- [ ] Créer `DeleteCaisseSpecialeContractModal` (confirmation destructive).
- [ ] Ajouter l’action “Supprimer” dans `ListContracts` (grille + liste) avec conditions d’éligibilité.
- [ ] Gérer les erreurs (contrat non supprimable, demande introuvable, etc.) avec messages explicites.

---

## 6. Tests à prévoir

- **Unitaires** :
  - Refus si statut interdit.
  - Refus si contributions/paiements présents.
  - Refus si remboursements présents.
  - Réactivation demande + contractId null.
  - Suppression PDF + sous‑collections + contrat.

- **Intégration / UI** :
  - Bouton “Supprimer” visible uniquement si éligible.
  - Modal destructive ouvre / confirme / annule.
  - Invalidation des queries après suppression.

---

## 7. Références

- `src/domains/financial/caisse-speciale/contrats/services/CaisseContractsService.ts`
- `src/domains/financial/caisse-speciale/contrats/repositories/CaisseContractsRepository.ts`
- `src/domains/financial/caisse-speciale/contrats/hooks/useCaisseContracts.ts`
- `src/db/caisse/payments.db.ts`
- `src/db/caisse/refunds.db.ts`
- `src/db/upload-image.db.ts`
- `src/components/caisse-speciale/ListContracts.tsx`
