# Supprimer un contrat – Caisse Imprévue V2

> Documentation de la fonctionnalité **Supprimer un contrat** sur la page des contrats Caisse Imprévue (`/caisse-imprevue`).  
> **Statut :** documentation uniquement (implémentation à faire après validation de cette spec).

---

## 1. Objectif

- Permettre à l’administrateur de **supprimer définitivement** un contrat CI.
- La suppression est **irréversible** et **réservée aux contrats sans activité** (aucun versement, aucun support, aucun remboursement, statut `ACTIVE`).

---

## 2. Règles métier

### 2.1 Quand peut-on supprimer ?

| Condition | Détail |
|---|---|
| Statut | **`ACTIVE` uniquement** |
| Versements | **Aucun paiement** : la sous‑collection `payments` est vide **et** `totalMonthsPaid === 0` |
| Support | **Aucun support** : `currentSupportId` vide **et** `supportHistory` vide **et** `supports` vide |
| Remboursements | **Aucun retrait anticipé / remboursement final** : `earlyRefunds` vide |

> Si une seule condition échoue, la suppression est **refusée** côté service avec un message explicite.

### 2.2 Quand est-ce interdit ?

- Contrat **`FINISHED`** ou **`CANCELED`** → suppression interdite.
- Présence de **versements**, **supports** ou **remboursements** → suppression interdite.
- **Contrat issu d’une demande** mais **demande introuvable** → suppression interdite (intégrité des données).

### 2.3 Effets de la suppression

- Le document Firestore **`contractsCI/{contractId}`** est supprimé.
- Les documents liés au contrat sont supprimés **(voir § 2.5)**.
- Si le contrat provient d’une demande, la **demande est réactivée** (voir § 2.4).

### 2.4 Contrat issu d’une demande : mise à jour obligatoire

Si le contrat contient un **`demandId`** (créé via *createContractFromDemand*), on doit **réactiver la demande** avant de supprimer le contrat :

- **`status: 'APPROVED'`**
- **`contractId: null`** (ou suppression du champ)
- **`updatedBy`**, **`updatedAt`**

> Cette étape est **obligatoire** pour permettre la recréation d’un contrat depuis la demande.

**Note type** : ajouter `demandId?: string` à `ContractCI` pour typer correctement ce lien.

### 2.5 Nettoyage Storage + documents (obligatoire)

Avant la suppression du contrat, supprimer **tous les documents liés** (si présents) :

- `contractStartId` (type `ADHESION_CI`)
- `contractCanceledId` (type `CANCELED_CI`)
- `contractFinishedId` (type `FINISHED_CI`)
- `earlyRefundDocumentId` (type `EARLY_REFUND_CI`)
- `finalRefundDocumentId` (type `FINAL_REFUND_CI`)

**Procédure** (best effort) :

1. `getDocumentById(id)` → récupérer `path`.
2. `deleteFile(path)` → supprimer le fichier Storage.
3. `deleteDocument(id)` → supprimer l’entrée Firestore.

> En cas d’échec sur un document, **logguer l’erreur et continuer** le nettoyage.

---

## 3. Parcours utilisateur

1. **Page** : `/caisse-imprevue` (liste des contrats).
2. **Bouton “Supprimer”** visible **uniquement** si le contrat est éligible (règles § 2.1).
   - Carte (grille) : bouton rouge “Supprimer”.
   - Liste : entrée “Supprimer” dans le menu actions.
3. **Clic sur “Supprimer”** → ouverture d’un **modal de confirmation** (`DeleteContractCIModal`).
4. **Modal** : message d’avertissement + bouton **“Supprimer”** (destructive).
5. **Après confirmation** : `deleteContractCI(contractId, adminId)` → nettoyage documents → update demande si besoin → suppression contrat → toast succès → refresh queries.

---

## 4. Architecture technique (domains)

L’implémentation suit l’architecture **domains**.  
Le code métier (service, hooks) vit sous `src/domains/financial/caisse-imprevue/`.  
Les composants UI restent dans `src/components/caisse-imprevue` et **importent les hooks du domaine**.

### 4.1 Chemins (domains)

| Rôle | Chemin |
|---|---|
| Service (métier) | `src/domains/financial/caisse-imprevue/services/CaisseImprevueService.ts` |
| Repository demande | `src/domains/financial/caisse-imprevue/repositories/DemandCIRepository.ts` |
| Repository contrat (utilisé par le service) | `src/repositories/caisse-imprevu/IContractCIRepository.ts` |
| Repository documents | `src/domains/infrastructure/documents/repositories/DocumentRepository.ts` |
| Hook mutations | `src/domains/financial/caisse-imprevue/hooks/useContractCIMutations.ts` (à créer) |
| UI liste | `src/components/caisse-imprevue/ListContractsCISection.tsx` |
| UI modal | `src/components/caisse-imprevue/DeleteContractCIModal.tsx` (à créer) |

**Note :** ajouter `deleteFile(path: string)` dans `DocumentRepository` (domains) pour permettre le cleanup Storage (la version legacy l’a déjà).

### 4.2 Service : `deleteContractCI` (pseudo‑code)

```ts
async deleteContractCI(contractId: string, adminId: string): Promise<void> {
  const contract = await this.contractRepository.getContractById(contractId)
  if (!contract) throw new Error('Contrat introuvable')

  if (contract.status !== 'ACTIVE') {
    throw new Error('Seuls les contrats actifs sans activité peuvent être supprimés')
  }

  const payments = await this.paymentRepository.getPaymentsByContractId(contractId)
  if (payments.length > 0 || contract.totalMonthsPaid > 0) {
    throw new Error('Impossible de supprimer un contrat avec des versements')
  }

  const supports = await this.supportRepository.getSupportHistory(contractId)
  if (supports.length > 0 || contract.currentSupportId || (contract.supportHistory?.length || 0) > 0) {
    throw new Error('Impossible de supprimer un contrat avec un support')
  }

  const refunds = await this.earlyRefundRepository.getEarlyRefundsByContractId(contractId)
  if (refunds.length > 0) {
    throw new Error('Impossible de supprimer un contrat avec un remboursement')
  }

  // 1) Si contrat issu d’une demande → réactiver la demande
  if ((contract as any).demandId) {
    const demandId = (contract as any).demandId as string
    const demand = await this.demandRepository.getById(demandId)
    if (!demand) throw new Error('Demande liée introuvable')

    await this.demandRepository.update(demandId, {
      status: 'APPROVED',
      contractId: null,
    }, adminId)
  }

  // 2) Nettoyage documents liés (best effort)
  const documentIds = [
    contract.contractStartId,
    contract.contractCanceledId,
    contract.contractFinishedId,
    contract.earlyRefundDocumentId,
    contract.finalRefundDocumentId,
  ].filter(Boolean) as string[]

  for (const id of documentIds) {
    try {
      const doc = await this.documentRepository.getDocumentById(id)
      if (doc?.path) await this.documentRepository.deleteFile(doc.path)
      await this.documentRepository.deleteDocument(id)
    } catch (err) {
      console.error('Erreur nettoyage document', id, err)
    }
  }

  // 3) Suppression du contrat
  await this.contractRepository.deleteContract(contractId)
}
```

### 4.3 Firestore

- `contractsCI` : `allow delete: if isAdmin()` (déjà présent). Aucun changement requis.
- Les règles `caisseImprevueDemands` doivent autoriser `update` par admin (déjà le cas).

### 4.4 Cloud Function

**Non nécessaire.** L’action est admin‑only et peut rester côté service.

---

## 5. Liste des tâches

- [ ] Ajouter `demandId?: string` au type `ContractCI` (pour typer le lien demande → contrat).
- [ ] Ajouter `deleteFile(path: string)` à `DocumentRepository` (domains) et adapter son usage.
- [ ] Implémenter `deleteContractCI(contractId, adminId)` dans `CaisseImprevueService` (domains).
- [ ] Créer `useContractCIMutations` avec mutation `deleteContract` + invalidations (`contractsCI`, `contractsCIStats`, `demand-detail`, `caisse-imprevue-demands`, `caisse-imprevue-demands-stats`).
- [ ] Créer `DeleteContractCIModal` (confirmation destructive).
- [ ] Ajouter l’action “Supprimer” dans `ListContractsCISection` (grille + liste) avec conditions d’éligibilité.
- [ ] Gérer les erreurs (contrat non supprimable, demande introuvable, etc.) avec messages explicites.
- [ ] Mettre à jour la documentation si des champs/chemins évoluent.

---

## 6. Tests à prévoir

- **Unitaires** :
  - `deleteContractCI` refuse si `status !== ACTIVE`.
  - Refus si paiements/supports/remboursements présents.
  - Mise à jour de la demande (status APPROVED + contractId null).
  - Nettoyage documents best‑effort.

- **Intégration / UI** :
  - Bouton “Supprimer” visible uniquement si éligible.
  - Modal destructive ouvre / confirme / annule.
  - Invalidation des queries `contractsCI`, `contractsCIStats`, et demandes si contrat issu d’une demande.

---

## 7. Références

- `src/domains/financial/caisse-imprevue/services/CaisseImprevueService.ts`
- `src/domains/financial/caisse-imprevue/repositories/DemandCIRepository.ts`
- `src/repositories/caisse-imprevu/IContractCIRepository.ts`
- `src/domains/infrastructure/documents/repositories/DocumentRepository.ts`
- `src/components/caisse-imprevue/ListContractsCISection.tsx`
- `src/components/caisse-imprevue/UploadContractCIModal.tsx`
