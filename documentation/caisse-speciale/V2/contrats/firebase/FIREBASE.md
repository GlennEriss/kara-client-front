# Firebase – Contrats Caisse Spéciale (V2)

> Ce document consolide les **règles Firestore**, **règles Storage** et **index** nécessaires pour le module Contrats Caisse Spéciale, en cohérence avec les diagrammes d'activité et de séquence.

**Références :**
- Diagrammes : `documentation/caisse-speciale/V2/contrats/activite/`, `sequence/`
- Points problématiques : `documentation/caisse-speciale/V2/contrats/points-problematiques/POINTS_PROBLEMATIQUES.md`
- Fichiers projet : `firestore.rules`, `storage.rules`, `firestore.indexes.json`

---

## Table des matières

1. [Règles Firestore](#1-règles-firestore)
2. [Règles Firebase Storage](#2-règles-firebase-storage)
3. [Index Firestore](#3-index-firestore)

---

## 1. Règles Firestore

### 1.1 Collection `caisseContracts`

#### Contexte

- **Lecture** : Admin uniquement (liste, détails, exports)
- **Création** : Admin uniquement (création contrat)
- **Mise à jour** : Admin uniquement (upload PDF, mises à jour versements/états)
- **Suppression** : Admin uniquement (exceptionnel)

#### Champs minimum recommandés

| Champ | Type | Contraintes |
|-------|------|-------------|
| `memberId` / `groupeId` | string | Un des deux requis selon `contractType` |
| `contractType` | string | `INDIVIDUAL` ou `GROUP` |
| `caisseType` | string | `STANDARD`, `JOURNALIERE`, `LIBRE`, variantes CHARITABLE |
| `monthlyAmount` | number | >= 0 |
| `monthsPlanned` | number | >= 1 |
| `status` | string | Statuts contrat (ACTIVE, LATE..., CLOSED, etc.) |
| `createdAt` | timestamp | Requis |
| `updatedAt` | timestamp | Requis |

#### Règles Firestore (extrait à intégrer)

```javascript
// ==========================================
// CONTRATS CAISSE SPÉCIALE (CAISSE CONTRACTS) - V2
// ==========================================
// Page /caisse-speciale/contrats
// Workflows : ListerContrats, FiltrerContrats, RechercherContrats,
//            VoirDetailsContrat, CreerContrat, TeleverserContratPDF,
//            ConsulterVersements, ExporterListeContrats, ExporterVersements

match /caisseContracts/{contractId} {
  allow read: if isAdmin();
  allow create: if isAdmin();
  allow update: if isAdmin();
  allow delete: if isAdmin();

  // Sous-collections
  match /payments/{paymentId} {
    allow read: if isAdmin();
    allow create, update, delete: if isAdmin();
  }

  match /refunds/{refundId} {
    allow read: if isAdmin();
    allow create, update, delete: if isAdmin();
  }
}
```

---

## 2. Règles Firebase Storage

### 2.1 Chemins utilisés

| Chemin | Usage | Règles actuelles |
|--------|-------|------------------|
| `contracts/{contractId}/{fileName}` | PDFs contrats CS signés | Lecture/écriture admin, PDF max 10 MB |
| `contract-documents/{contractId}/{refundId}/{fileName}` | PDFs remboursements CS | Lecture/écriture admin, PDF max 10 MB |
| `caisse/{contractId}/payments/{paymentId}/{fileName}` | Preuves de paiement | Lecture/écriture admin, image max 5 MB |

### 2.2 Exemple de règles Storage (extrait)

```javascript
// Contrats signés (PDF)
match /contracts/{contractId}/{fileName} {
  allow read: if isAdmin();
  allow write: if isAdmin() &&
    request.resource.contentType.matches('application/pdf') &&
    request.resource.size < 10 * 1024 * 1024;
}

// Remboursements (PDF)
match /contract-documents/{contractId}/{refundId}/{fileName} {
  allow read: if isAdmin();
  allow write: if isAdmin() &&
    request.resource.contentType.matches('application/pdf') &&
    request.resource.size < 10 * 1024 * 1024;
}

// Preuves de paiement (image)
match /caisse/{contractId}/payments/{paymentId}/{fileName} {
  allow read: if isAdmin();
  allow write: if isAdmin() &&
    request.resource.contentType.matches('image/(jpeg|jpg|png|webp)') &&
    request.resource.size < 5 * 1024 * 1024;
}
```

---

## 3. Index Firestore

### 3.1 Requêtes supportées (d’après les diagrammes)

| Workflow | Requête | Champs utilisés |
|----------|---------|-----------------|
| ListerContrats | Liste paginée par statut | `status`, `createdAt` DESC |
| FiltrerContrats | Filtre statut + type + caisse + dates | `status`, `contractType`, `caisseType`, `createdAt` |
| RechercherContrats | Recherche nom/prénom/matricule | `searchableText*`, `createdAt` |
| Retard | Contrats en retard | `status`, `nextDueAt` |
| Versements | Sous-collection payments | `dueAt`, `status` |

### 3.2 Index à ajouter dans `firestore.indexes.json`

Ajouter les blocs suivants dans le tableau "indexes" :

```json
{
  "collectionGroup": "caisseContracts",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "caisseContracts",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "contractType", "order": "ASCENDING" },
    { "fieldPath": "caisseType", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "caisseContracts",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "searchableText", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "caisseContracts",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "searchableTextFirstNameFirst", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "caisseContracts",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "searchableTextMatriculeFirst", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

*Dernière mise à jour : 2026-02-03*
