# Modifier un contrat signé (PDF téléversé) – Crédit Spéciale V2

> Documentation de la fonctionnalité **Modifier un contrat signé** sur la page des contrats de crédit spéciale (`/credit-speciale/contrats`).  
> **Statut :** documentation uniquement (implémentation à faire après validation de cette spec).

---

## Sommaire

- [1. Objectif](#1-objectif)
- [2. Règles métier](#2-règles-métier)
- [3. Parcours utilisateur](#3-parcours-utilisateur)
- [4. Architecture technique](#4-architecture-technique)
- [5. Firestore](#5-firestore)
- [6. Cloud Function](#6-cloud-function)
- [7. Checklist avant implémentation](#7-checklist-avant-implémentation)
- [8. Références](#8-références)

---

## 1. Objectif

- Permettre à l’administrateur de **remplacer** un contrat signé déjà téléversé.
- Le remplacement doit être **bloqué** lorsque le contrat est **DISCHARGED** ou **CLOSED** (le bouton est caché dans ces deux cas).

---

## 2. Règles métier

### 2.1 Quand peut-on modifier ?

| Condition | Détail |
|-----------|--------|
| Contrat signé existant | **signedContractUrl** doit exister. |
| Statut autorisé | Tout statut **sauf** **DISCHARGED** et **CLOSED**. |

### 2.2 Quand est-ce interdit ?

- **DISCHARGED** ou **CLOSED** → **modification interdite** + bouton caché.
- Si **signedContractUrl** est vide → on ne propose pas “Modifier”, on garde **“Téléverser contrat signé”**.

### 2.3 Effets d’un remplacement

- Le **PDF signé** existant est **remplacé** par le nouveau fichier.
- Le **statut** du contrat **ne change pas** (pas de ré‑activation, pas de remise de fonds).
- Mise à jour de la traçabilité : **updatedBy**, **updatedAt**.

### 2.4 Nettoyage fichiers/documents (obligatoire)

Lors d’un remplacement :

1. Supprimer le fichier Storage de l’ancien contrat signé.
2. Supprimer l’entrée **documents** associée à l’ancien contrat signé.
3. Uploader le nouveau PDF et créer une nouvelle entrée **documents**.

> En cas d’échec de suppression d’un fichier/document, **logguer l’erreur** et **continuer** le remplacement (best effort).

### 2.5 Données à stocker pour permettre le remplacement

Pour pouvoir supprimer proprement l’ancien fichier, on **stocke explicitement** sur le contrat :

- **signedContractUrl** (déjà existant)
- **signedContractPath** (nouveau)
- **signedContractDocumentId** (nouveau)

Ces champs sont mis à jour à chaque upload/remplacement.

---

## 3. Parcours utilisateur

1. **Page** : `/credit-speciale/contrats` (liste des contrats).
2. **Si `signedContractUrl` existe** ET statut ≠ **DISCHARGED/CLOSED** → afficher bouton **« Modifier contrat signé »**.
3. **Si `signedContractUrl` vide** → afficher **« Téléverser contrat signé »** (comportement actuel).
4. **Si statut DISCHARGED/CLOSED** → **bouton modifier caché**.
5. **Clic sur “Modifier contrat signé”** → ouverture d’un **modal** de remplacement.
6. **Modal** :
   - Message clair : “Le fichier précédent sera remplacé”.
   - Input fichier PDF (obligatoire).
   - Boutons : **Annuler** / **Remplacer**.
7. **Après confirmation** : appel du service `replaceSignedContract(contractId, file, adminId)` → cleanup → upload → update contrat → toast succès → refresh queries.

Même logique à appliquer si l’upload est possible depuis la **page détail** `/credit-speciale/contrats/[id]`.

---

## 4. Architecture technique

L’implémentation suit l’architecture **domains** (même approche que `modifier-demande`).  
Le code métier (service, hooks, types) vit sous **`src/domains/financial/credit-speciale/contrats/`**.  
Les composants UI restent dans `src/components/credit-speciale` et **importent les hooks du domaine**.

### 4.1 Chemins (domains)

| Rôle | Chemin |
|------|--------|
| Entities | `src/domains/financial/credit-speciale/contrats/entities/contract.types.ts` |
| Service | `src/domains/financial/credit-speciale/contrats/services/CreditContractService.ts` |
| Hook mutations | `src/domains/financial/credit-speciale/contrats/hooks/useCreditContractMutations.ts` |
| Repository contrat (utilisé par le service) | `src/repositories/credit-speciale/CreditContractRepository.ts` |
| Repository documents | `src/domains/infrastructure/documents/repositories/DocumentRepository.ts` |
| UI liste | `src/components/credit-speciale/ListContrats.tsx` |
| UI détail | `src/components/credit-speciale/CreditContractDetail.tsx` |

**Note :** le repository contrat reste celui existant ; le **service du domaine** l’utilise (via factory ou injection). Aucun déplacement de repository n’est prévu dans cette V2.

### 4.2 Service (domaine) : `replaceSignedContract`

```ts
async replaceSignedContract(contractId: string, file: File, adminId: string): Promise<CreditContract> {
  const contract = await this.creditContractRepository.getContractById(contractId);
  if (!contract) throw new Error('Contrat introuvable');

  if (['DISCHARGED', 'CLOSED'].includes(contract.status)) {
    throw new Error('Contrat clôturé : remplacement interdit');
  }
  if (!contract.signedContractUrl) {
    throw new Error('Aucun contrat signé à remplacer');
  }

  // 1) Cleanup ancien fichier/doc
  if (contract.signedContractPath) {
    await this.documentRepository.deleteFile(contract.signedContractPath);
  }
  if (contract.signedContractDocumentId) {
    await this.documentRepository.deleteDocument(contract.signedContractDocumentId);
  }

  // 2) Upload nouveau fichier
  const { url, path } = await this.documentRepository.uploadDocumentFile(
    file,
    contract.clientId,
    'CREDIT_SPECIALE_CONTRACT_SIGNED'
  );

  // 3) Créer document + update contrat
  const doc = await this.documentRepository.createDocument({
    type: 'CREDIT_SPECIALE_CONTRACT_SIGNED',
    format: 'pdf',
    libelle: `Contrat signé crédit ${contract.creditType}`,
    path,
    url,
    size: file.size,
    memberId: contract.clientId,
    contractId: contract.id,
    createdBy: adminId,
    updatedBy: adminId,
  });

  return this.creditContractRepository.updateContract(contractId, {
    signedContractUrl: url,
    signedContractPath: path,
    signedContractDocumentId: doc.id,
    updatedBy: adminId,
    updatedAt: new Date(),
  });
}
```

**Note :** l’upload initial reste dans `uploadSignedContract(...)`, qui **active** le contrat si nécessaire. Le **remplacement** ne change pas le statut.

---

## 5. Firestore

- Aucune règle supplémentaire requise (admin only).
- Vérifier que les nouveaux champs (`signedContractPath`, `signedContractDocumentId`) sont autorisés en update.

---

## 6. Cloud Function

**Non nécessaire.** Tout est fait côté service admin.

---

## 7. Checklist avant implémentation

- [ ] Bouton **Modifier contrat signé** visible uniquement si `signedContractUrl` existe et status ≠ **DISCHARGED/CLOSED**.
- [ ] Modale “remplacement” (message clair + input PDF).
- [ ] Service domaine `replaceSignedContract` avec cleanup + update contrat.
- [ ] Champs `signedContractPath` et `signedContractDocumentId` ajoutés au type **CreditContract** (domain entities).
- [ ] Hook domaine : invalidation queries `creditContracts`, `creditContract`, `creditContractsStats`.

---

## 8. Références

- **Upload contrat signé** : `src/domains/financial/credit-speciale/contrats/services/CreditContractService.ts` → `uploadSignedContract()`.
- **UI liste** : `src/components/credit-speciale/ListContrats.tsx`.
- **UI détail** : `src/components/credit-speciale/CreditContractDetail.tsx`.
- **Documents** : `src/domains/infrastructure/documents/repositories/DocumentRepository.ts`.
