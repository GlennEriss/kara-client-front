# Supprimer un contrat – Crédit Spéciale V2

> Documentation de la fonctionnalité **Supprimer un contrat** sur la page des contrats de crédit spéciale (`/credit-speciale/contrats`).  
> **Statut :** documentation uniquement (implémentation à faire après validation de cette spec).

---

## 1. Objectif

- Permettre à l’administrateur de **supprimer définitivement** un contrat de crédit depuis la liste des contrats (`/credit-speciale/contrats`).
- La suppression est **irréversible** et réservée aux contrats n’ayant pas encore été activés ni payés (statut **PENDING** ou **DRAFT**, aucun versement enregistré).

---

## 2. Règles métier

### 2.1 Quand peut-on supprimer ?

| Condition | Détail |
|-----------|--------|
| Statut du contrat | **PENDING** (en attente de signature / téléversement) ou **DRAFT** (brouillon). |
| Aucun versement | **amountPaid** doit être égal à **0**. Dès qu’un paiement a été enregistré, le contrat ne peut plus être supprimé. |

Si le contrat est **ACTIVE**, **OVERDUE**, **PARTIAL**, **DISCHARGED**, **CLOSED**, etc., ou si **amountPaid > 0**, la suppression est refusée côté service avec un message d’erreur explicite.

### 2.2 Effets de la suppression

- Le **document du contrat** est supprimé de la collection Firestore **creditContracts**.
- **Demande associée** : voir [§ 2.3](#23-contrat-issu-dune-demande-mise-à-jour-de-la-demande) (obligatoire).
- **Fichiers et documents** : voir [§ 2.4](#24-cleanup-storage-et-documents) (recommandé).
- Aucune suppression en cascade des échéances, paiements ou pénalités n’est nécessaire pour un contrat PENDING/DRAFT sans versement.

### 2.3 Contrat issu d’une demande : mise à jour de la demande

Aujourd’hui, **createContractFromDemand** refuse de créer un contrat si **demand.contractId** est déjà renseigné. Si on supprime un contrat **sans** vider **contractId** sur la demande, la demande reste bloquée et on ne peut plus recréer de contrat à partir d’elle.

Donc la doc impose :

- **Si `contract.demandId` existe** → **mettre à jour la demande** avant ou après la suppression du contrat :
  - **contractId** est **mis à `null`**.
  - **updatedBy** et **updatedAt** sont renseignés.
- **Aucune traçabilité supplémentaire** n’est ajoutée dans cette V2 (pas de `contractDeletedAt` / `deletedContractId`).

### 2.4 Cleanup Storage et documents

Si un **PDF de contrat** a été généré ou téléversé, des fichiers existent en **Storage** et des entrées peuvent exister dans la collection **documents** (ou équivalent) pour **contractUrl**, **signedContractUrl**, **documentId**, etc. Supprimer uniquement le document Firestore **creditContracts** laisse ces fichiers et références « orphelins ».

**Décision retenue : nettoyage systématique.**

Dans **deleteContract** :

1. **Supprimer les fichiers Storage** référencés par **contract.contractUrl** et **contract.signedContractUrl** (si présents) via `DocumentRepository.deleteFile(path)`.
2. **Supprimer les documents** liés dans la collection **documents** (si un **documentId** est stocké sur le contrat) via `DocumentRepository.deleteDocument(id)`.
3. **Supprimer le document contrat** dans **creditContracts**.

> En cas d’échec de suppression d’un fichier/document, **logguer l’erreur** et **continuer** la suppression du contrat (best effort).


---

## 3. Parcours utilisateur

1. **Page** : `/credit-speciale/contrats` (liste des contrats).
2. **Vue grille** : sur chaque carte d’un contrat supprimable (PENDING/DRAFT, amountPaid === 0), afficher un bouton **« Supprimer »** (icône poubelle) ou une entrée **« Supprimer »** dans un menu d’actions (dropdown).
3. **Vue liste** : dans la colonne **Actions**, menu dropdown (trois points) avec une entrée **« Supprimer »** pour les contrats supprimables.
4. **Clic sur « Supprimer »** : ouverture d’un **modal de confirmation** (**DeleteCreditContractModal**).
5. **Modal** :
   - Avertissement : action irréversible.
   - Confirmation par **recopie de l’ID du contrat** et du **nom du client** (comme pour la suppression de demande).
   - Boutons : **Annuler** / **Supprimer définitivement** (désactivé tant que la confirmation n’est pas valide).
6. **Après confirmation** : appel du service **deleteContract(contractId, adminId)** → mise à jour demande si `demandId` → cleanup Storage/documents → suppression du document contrat → fermeture du modal, toast de succès, invalidation des queries **creditContracts**, **creditContractsStats**, **creditContract**, **creditDemands**, **creditDemandsStats**.

---

## 4. Architecture technique

**Décision : implémentation V2 dans les chemins actuels (legacy).**  
La migration vers **domains** est **hors scope** de cette spec et sera traitée dans un ticket dédié.

### 4.1 Chemins retenus (legacy)

| Rôle | Chemin |
|------|--------|
| Repository contrat (interface) | `src/repositories/credit-speciale/ICreditContractRepository.ts` |
| Repository contrat (impl.) | `src/repositories/credit-speciale/CreditContractRepository.ts` |
| Repository demande | `src/repositories/credit-speciale/ICreditDemandRepository.ts` |
| Repository documents | `src/repositories/documents/DocumentRepository.ts` |
| Service | `src/services/credit-speciale/CreditSpecialeService.ts` |
| Hook mutations contrats | `src/hooks/useCreditSpeciale.ts` (useCreditContractMutations) |
| Modal suppression | `src/components/credit-speciale/DeleteCreditContractModal.tsx` |
| Liste contrats | `src/components/credit-speciale/ListContrats.tsx` |

### 4.2 Fichiers / couches concernés (indépendamment du chemin)

| Couche | Rôle |
|--------|------|
| **Repository** | Interface : **deleteContract(id: string): Promise<void>** (déjà présente dans `ICreditContractRepository`). Implémentation : suppression du document **creditContracts/{id}**. |
| **Service** | **deleteContract(id: string, adminId: string): Promise<void>** : 1) charger le contrat ; 2) vérifier statut (DRAFT/PENDING) et amountPaid === 0 ; 3) si **contract.demandId**, mettre à jour la demande (`contractId: null`, `updatedBy`, `updatedAt`) ; 4) cleanup Storage/documents via `DocumentRepository` (§ 2.4) ; 5) appeler **creditContractRepository.deleteContract(id)**. |
| **Hook** | Mutation **deleteContract** dans **useCreditContractMutations()** : appel du service, invalidation **creditContracts**, **creditContractsStats**, **creditContract**, et **creditDemands** / **creditDemandsStats** si mise à jour demande. |
| **Modal** | **DeleteCreditContractModal** : confirmation par ID contrat + nom client, appel à la mutation **deleteContract**. |
| **Liste** | **ListContrats** : bouton / entrée « Supprimer » (grille + liste), affiché seulement si contrat supprimable ; ouverture du modal avec le contrat sélectionné. |

### 4.3 Service : deleteContract (pseudo-code)

```ts
async deleteContract(id: string, adminId: string): Promise<void> {
  const contract = await this.creditContractRepository.getContractById(id);
  if (!contract) throw new Error('Contrat introuvable');
  const allowedStatuses = ['DRAFT', 'PENDING'];
  if (!allowedStatuses.includes(contract.status)) {
    throw new Error('Seuls les contrats en brouillon ou en attente peuvent être supprimés');
  }
  if (contract.amountPaid > 0) {
    throw new Error('Impossible de supprimer un contrat pour lequel des versements ont été enregistrés');
  }

  // 1) Mise à jour de la demande liée (si demandId)
  if (contract.demandId) {
    await this.creditDemandRepository.updateDemand(contract.demandId, {
      contractId: null,
      updatedBy: adminId,
      updatedAt: new Date(),
    });
  }

  // 2) Cleanup Storage et documents (§ 2.4)
  // if (contract.contractUrl) await this.documentRepository.deleteFile(contract.contractUrl);
  // if (contract.signedContractUrl) await this.documentRepository.deleteFile(contract.signedContractUrl);
  // if (contract.documentId) await this.documentRepository.deleteDocument(contract.documentId);

  // 3) Suppression du document contrat
  await this.creditContractRepository.deleteContract(id);
}
```

### 4.4 Firestore

- La collection **creditContracts** dispose déjà d’une règle **allow delete: if isAdmin();** dans `firestore.rules`. Aucune modification des règles n’est nécessaire pour la suppression du contrat.
- Vérifier que **creditDemands** autorise bien l’**update** de **contractId**, **updatedBy**, **updatedAt** pour un admin.

### 4.5 Cloud Function

**Non nécessaire.**  
La suppression est déclenchée par un admin côté UI et gérée intégralement dans le service applicatif. Aucun trigger Firestore ni fonction planifiée n’est requis pour cette V2.

---

## 5. Checklist avant implémentation

- [ ] **Politique demande** : `contractId` mis à `null`, `updatedBy` + `updatedAt` renseignés.
- [ ] **Cleanup Storage/documents** : nettoyage systématique implémenté (URLs + documents liés).
- [ ] **Chemins** : implémentation réalisée dans les chemins legacy listés en § 4.1.
- [ ] **Cloud Function** : aucune fonction créée (confirmé § 4.5).
- [ ] **Repository** : s’assurer que **updateDemand** accepte bien `contractId: null` (ou suppression du champ si nécessaire) pour Firestore.

---

## 6. Références

- **Suppression de demande** : `src/components/credit-speciale/DeleteCreditDemandModal.tsx`, mutation **deleteDemand** dans **useCreditDemandMutations()** (pattern de confirmation ID + nom client).
- **Liste des contrats** : `src/components/credit-speciale/ListContrats.tsx`.
- **Types** : `src/types/types.ts` – **CreditContract**, **CreditContractStatus** ; **CreditDemand** (pour contractId, et éventuellement champs de traçabilité).
- **Repository contrat** : `src/repositories/credit-speciale/ICreditContractRepository.ts` – **deleteContract(id)**.
- **Repository demande** : `src/repositories/credit-speciale/ICreditDemandRepository.ts` – **updateDemand(id, data)** (pour vider contractId).
- **Repository documents** : `src/repositories/documents/DocumentRepository.ts` – **deleteFile(path)** / **deleteDocument(id)**.
- **Modifier une demande** : `documentation/credit-speciale/V2/modifier-demande/README.md`.
