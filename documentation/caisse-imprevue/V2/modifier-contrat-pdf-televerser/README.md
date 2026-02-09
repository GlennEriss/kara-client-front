# Modifier un contrat (PDF téléversé) – Caisse Imprévue V2

> Documentation de la fonctionnalité **Modifier un contrat téléversé** sur la page des contrats Caisse Imprévue (`/caisse-imprevue`).  
> **Statut :** documentation uniquement (implémentation à faire après validation de cette spec).

---

## 1. Objectif

- Permettre à l’administrateur de **remplacer** le PDF d’un contrat déjà téléversé.
- Le remplacement est **interdit** lorsque le contrat n’est plus actif.

---

## 2. Règles métier

### 2.1 Quand peut-on modifier ?

| Condition | Détail |
|---|---|
| Contrat téléversé existant | **`contractStartId`** doit exister. |
| Statut autorisé | **`ACTIVE` uniquement**. |

### 2.2 Quand est-ce interdit ?

- **`FINISHED`** ou **`CANCELED`** → modification interdite + bouton caché.
- Si **`contractStartId`** est vide → on ne propose pas “Modifier”, on garde **“Téléverser contrat”**.

### 2.3 Effets d’un remplacement

- Le **PDF téléversé** est **remplacé** par le nouveau fichier.
- Le **statut** du contrat **ne change pas**.
- Mise à jour de la traçabilité : **`updatedBy`**, **`updatedAt`**.

### 2.4 Nettoyage fichiers/documents (obligatoire)

Lors d’un remplacement :

1. Supprimer le fichier Storage de l’ancien contrat (via `Document.path`).
2. Supprimer l’entrée **documents** associée (ID = `contractStartId`).
3. Uploader le nouveau PDF et créer une **nouvelle** entrée **documents**.

> En cas d’échec de suppression d’un fichier/document, **logguer l’erreur et continuer** (best effort).

---

## 3. Parcours utilisateur

1. **Page** : `/caisse-imprevue` (liste des contrats).
2. **Si `contractStartId` existe ET status === ACTIVE** → afficher **“Modifier contrat”**.
3. **Si `contractStartId` vide** → afficher **“Téléverser contrat”** (comportement actuel).
4. **Si status FINISHED/CANCELED** → **bouton modifier caché**.
5. **Clic sur “Modifier contrat”** → ouverture d’un **modal de remplacement** (`ReplaceContractCIModal`).
6. **Modal** : message “Le fichier précédent sera remplacé”, input PDF obligatoire, boutons **Annuler / Remplacer**.
7. **Après confirmation** : `replaceContractDocument(contractId, file, adminId)` → cleanup → upload → update contrat → toast succès → refresh queries.

Même logique si l’action est proposée dans la page détail `/caisse-imprevue/contrats/[id]`.

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
| Hook mutations | `src/domains/financial/caisse-imprevue/hooks/useContractCIMutations.ts` |
| UI liste | `src/components/caisse-imprevue/ListContractsCISection.tsx` |
| UI modal | `src/components/caisse-imprevue/ReplaceContractCIModal.tsx` (à créer) |

**Note :** ajouter `deleteFile(path: string)` dans `DocumentRepository` (domains) pour permettre le cleanup Storage (la version legacy l’a déjà).

### 4.2 Service : `replaceContractDocument` (pseudo‑code)

```ts
async replaceContractDocument(contractId: string, file: File, adminId: string): Promise<ContractCI> {
  const contract = await this.contractRepository.getContractById(contractId)
  if (!contract) throw new Error('Contrat introuvable')

  if (contract.status !== 'ACTIVE') {
    throw new Error('Contrat non actif : remplacement interdit')
  }

  if (!contract.contractStartId) {
    throw new Error('Aucun contrat téléversé à remplacer')
  }

  // 1) Supprimer l’ancien document (best effort)
  try {
    const oldDoc = await this.documentRepository.getDocumentById(contract.contractStartId)
    if (oldDoc?.path) await this.documentRepository.deleteFile(oldDoc.path)
    await this.documentRepository.deleteDocument(contract.contractStartId)
  } catch (err) {
    console.error('Erreur suppression ancien contrat', err)
  }

  // 2) Uploader le nouveau PDF
  const { url, path, size } = await this.documentRepository.uploadDocumentFile(
    file,
    contract.memberId,
    'ADHESION_CI'
  )

  // 3) Créer le document + update contrat
  const doc = await this.documentRepository.createDocument({
    type: 'ADHESION_CI',
    format: 'pdf',
    libelle: `Contrat CI - ${contract.memberId}`,
    path,
    url,
    size,
    memberId: contract.memberId,
    contractId: contract.id,
    createdBy: adminId,
    updatedBy: adminId,
  })

  return await this.contractRepository.updateContract(contractId, {
    contractStartId: doc.id,
    updatedBy: adminId,
  })
}
```

### 4.3 Firestore

- `contractsCI` : `allow update: if isAdmin()` (déjà présent). Aucun changement requis.
- `documents` : création/suppression admin only (déjà le cas).

### 4.4 Cloud Function

**Non nécessaire.** L’action est admin‑only et peut rester côté service.

---

## 5. Liste des tâches

- [ ] Ajouter `deleteFile(path: string)` dans `DocumentRepository` (domains).
- [ ] Implémenter `replaceContractDocument(contractId, file, adminId)` dans `CaisseImprevueService`.
- [ ] Ajouter la mutation `replaceContractDocument` dans `useContractCIMutations` + invalidations (`contractsCI`, `contractsCIStats`, `contractCI`, `documents`).
- [ ] Créer `ReplaceContractCIModal` (confirmation + input PDF).
- [ ] Ajouter le bouton **“Modifier contrat”** dans `ListContractsCISection` (grille + liste) avec conditions d’éligibilité.
- [ ] Gérer les erreurs (contrat non actif, document introuvable, etc.) avec messages explicites.
- [ ] Mettre à jour la documentation si des champs/chemins évoluent.

---

## 6. Tests à prévoir

- **Unitaires** :
  - Refus si `status !== ACTIVE`.
  - Refus si `contractStartId` manquant.
  - Remplacement OK : suppression ancien document + update contrat.

- **Intégration / UI** :
  - Bouton “Modifier contrat” visible uniquement si éligible.
  - Modal destructive ouvre / confirme / annule.
  - Invalidation des queries après remplacement.

---

## 7. Références

- `src/domains/financial/caisse-imprevue/services/CaisseImprevueService.ts`
- `src/domains/financial/caisse-imprevue/hooks/useContractCIMutations.ts`
- `src/repositories/caisse-imprevu/IContractCIRepository.ts`
- `src/domains/infrastructure/documents/repositories/DocumentRepository.ts`
- `src/components/caisse-imprevue/ListContractsCISection.tsx`
- `src/components/caisse-imprevue/UploadContractCIModal.tsx`
