# Modifier un contrat (PDF téléversé) – Caisse Spéciale V2

> Documentation de la fonctionnalité **Modifier un contrat téléversé** sur la page des contrats Caisse Spéciale (`/caisse-speciale`).  
> **Statut :** documentation uniquement (implémentation à faire après validation de cette spec).

---

## Sommaire

- [1. Objectif](#1-objectif)
- [2. Règles métier](#2-règles-métier)
- [3. Parcours utilisateur](#3-parcours-utilisateur)
- [4. Architecture technique](#4-architecture-technique)
- [5. Liste des tâches](#5-liste-des-tâches)
- [6. Tests à prévoir](#6-tests-à-prévoir)
- [7. Références](#7-références)

---

## 1. Objectif

- Permettre à l’administrateur de **remplacer** le PDF d’un contrat déjà téléversé.
- Le remplacement doit être **bloqué** lorsque le contrat est clôturé ou résilié.

---

## 2. Règles métier

### 2.1 Quand peut-on modifier ?

| Condition | Détail |
|---|---|
| Contrat téléversé existant | **`contractPdf`** doit exister. |
| Statut autorisé | **`DRAFT`**, **`ACTIVE`**, **`LATE_NO_PENALTY`**, **`LATE_WITH_PENALTY`**. |

### 2.2 Quand est-ce interdit ?

- Statuts **`CLOSED`**, **`RESCINDED`**, **`DEFAULTED_AFTER_J12`**, **`EARLY_WITHDRAW_REQUESTED`**, **`EARLY_REFUND_PENDING`**, **`FINAL_REFUND_PENDING`** → **modification interdite** + bouton caché.
- Si **`contractPdf`** est vide → on ne propose pas **« Modifier contrat »**, on garde **« Téléverser contrat »**.

### 2.3 Effets d’un remplacement

- Le **PDF téléversé** est **remplacé** par le nouveau fichier.
- Le **statut** du contrat **ne change pas**.
- Mise à jour de la traçabilité : **`updatedBy`**, **`updatedAt`**.

### 2.4 Nettoyage fichiers/documents (obligatoire)

Lors d’un remplacement :

1. Supprimer le fichier Storage de l’ancien contrat (via `contractPdf.path`).
2. Supprimer l’entrée **documents** associée (type `ADHESION_CS`, `contractId` = contrat).
3. Uploader le nouveau PDF et créer une **nouvelle** entrée **documents**.

> En cas d’échec de suppression d’un fichier/document, **logguer l’erreur** et **continuer le remplacement** (best effort).

---

## 3. Parcours utilisateur

1. **Page** : `/caisse-speciale` (liste des contrats).
2. **Si `contractPdf` existe** ET statut autorisé → afficher le bouton **« Modifier contrat »**.
3. **Si `contractPdf` vide** → afficher **« Téléverser contrat »** (comportement actuel).
4. **Si statut interdit** → **bouton modifier caché**.
5. **Clic sur « Modifier contrat »** → ouverture d’un **modal de remplacement** (`ReplaceCaisseSpecialeContractPdfModal`).
6. **Modal** : message clair “Le fichier précédent sera remplacé”, input PDF obligatoire, boutons **Annuler** / **Remplacer**.
7. **Après confirmation** : `replaceContractPdf(contractId, file, adminId)` → cleanup → upload → update contrat → toast succès → refresh queries.

Même logique si l’action est proposée dans la page détail `/caisse-speciale/contrats/[id]`.

---

## 4. Architecture technique

L’implémentation suit l’architecture **domains**.  
Le code métier (service, hooks) vit sous `src/domains/financial/caisse-speciale/contrats/`.  
Les composants UI restent dans `src/components/caisse-speciale` et **importent les hooks du domaine**.

### 4.1 Chemins (domains)

| Rôle | Chemin |
|---|---|
| Service (métier) | `src/domains/financial/caisse-speciale/contrats/services/CaisseContractsService.ts` |
| Repository contrats | `src/domains/financial/caisse-speciale/contrats/repositories/CaisseContractsRepository.ts` |
| Repository documents | `src/domains/infrastructure/documents/repositories/DocumentRepository.ts` |
| Storage utils | `src/db/upload-image.db.ts` (`deleteFile`) |
| Hook mutations | `src/domains/financial/caisse-speciale/contrats/hooks/useCaisseContracts.ts` |
| UI liste | `src/components/caisse-speciale/ListContracts.tsx` |
| UI modal | `src/components/caisse-speciale/ReplaceCaisseSpecialeContractPdfModal.tsx` (à créer) |

### 4.2 Service : `replaceContractPdf` (pseudo‑code)

```ts
async replaceContractPdf(contractId: string, file: File, adminId: string): Promise<ContractPdfMetadata> {
  const contract = await this.contractRepository.getContractById(contractId)
  if (!contract) throw new Error('Contrat introuvable')

  const allowedStatuses = ['DRAFT', 'ACTIVE', 'LATE_NO_PENALTY', 'LATE_WITH_PENALTY']
  if (!allowedStatuses.includes(contract.status)) {
    throw new Error('Contrat non modifiable : remplacement interdit')
  }

  if (!contract.contractPdf?.path) {
    throw new Error('Aucun contrat téléversé à remplacer')
  }

  // 1) Nettoyage ancien fichier (best effort)
  try {
    await deleteFile(contract.contractPdf.path)
  } catch (err) {
    console.error('Erreur suppression ancien PDF:', err)
  }

  // 2) Supprimer l’ancien document dans la collection documents
  try {
    const docs = await this.documentRepository.getDocumentsByContractId(contractId)
    const oldDocs = docs.filter((d) => d.type === 'ADHESION_CS')
    for (const d of oldDocs) {
      await this.documentRepository.deleteDocument(d.id)
    }
  } catch (err) {
    console.error('Erreur suppression documents:', err)
  }

  // 3) Upload nouveau PDF
  const upload = await createFile(file, contractId, `contracts/${contractId}`)
  const payload = {
    fileSize: file.size,
    path: upload.path,
    originalFileName: file.name,
    uploadedAt: new Date(),
    url: upload.url,
  }

  await updateContractPdf(contractId, payload, adminId)

  await this.documentRepository.createDocument({
    type: 'ADHESION_CS',
    format: 'pdf',
    libelle: `Contrat Caisse Spéciale #${contractId.slice(-6)}`,
    path: upload.path,
    url: upload.url,
    size: file.size,
    memberId: contract.memberId || `GROUP_${contract.groupeId}`,
    contractId,
    createdBy: adminId,
    updatedBy: adminId,
  })

  return payload
}
```

### 4.3 Firestore

- `caisseContracts` : `allow update: if isAdmin()` (déjà présent). Aucun changement requis.
- `documents` : création/suppression admin only (déjà le cas).

### 4.4 Cloud Function

**Non nécessaire.** L’action est admin‑only et peut rester côté service.

---

## 5. Liste des tâches

- [ ] Ajouter `replaceContractPdf(contractId, file, adminId)` dans `CaisseContractsService`.
- [ ] Ajouter `replaceContractPdf(...)` ou `cleanupContractPdf(...)` dans `CaisseContractsRepository` (si on veut centraliser le flux).
- [ ] Utiliser `DocumentRepository` pour supprimer l’ancien doc `ADHESION_CS` et créer le nouveau.
- [ ] Ajouter la mutation `replaceContractPdf` dans `useCaisseContracts` + invalidations (`caisse-contract`, `caisse-contracts`, `caisse-contracts-stats`).
- [ ] Créer `ReplaceCaisseSpecialeContractPdfModal` (confirmation + input PDF).
- [ ] Ajouter le bouton **« Modifier contrat »** dans `ListContracts` (grille + liste) avec conditions d’éligibilité.
- [ ] Gérer les erreurs (contrat non modifiable, PDF introuvable, etc.) avec messages explicites.

---

## 6. Tests à prévoir

- **Unitaires** :
  - Refus si statut interdit.
  - Refus si `contractPdf` manquant.
  - Remplacement OK : suppression ancien PDF + update contrat + création doc.

- **Intégration / UI** :
  - Bouton “Modifier contrat” visible uniquement si éligible.
  - Modal destructive ouvre / confirme / annule.
  - Invalidation des queries après remplacement.

---

## 7. Références

- `src/domains/financial/caisse-speciale/contrats/services/CaisseContractsService.ts`
- `src/domains/financial/caisse-speciale/contrats/repositories/CaisseContractsRepository.ts`
- `src/domains/financial/caisse-speciale/contrats/hooks/useCaisseContracts.ts`
- `src/domains/infrastructure/documents/repositories/DocumentRepository.ts`
- `src/db/upload-image.db.ts`
- `src/components/caisse-speciale/ListContracts.tsx`
- `src/components/caisse-speciale/ContractPdfUploadModal.tsx`
