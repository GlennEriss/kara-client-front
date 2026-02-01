# Firebase – Demandes Caisse Spéciale (V2)

> Ce document consolide les **règles Firestore**, **règles Storage** et **index** nécessaires pour le module Demandes Caisse Spéciale, en cohérence avec les diagrammes d'activité et de séquence.

**Références :**
- Diagrammes : `documentation/caisse-speciale/V2/demandes/activite/`, `sequence/`
- Points problématiques : `documentation/caisse-speciale/V2/demandes/points-problematiques/POINTS_PROBLEMATIQUES.md`
- Fichiers projet : `firestore.rules`, `storage.rules`, `firestore.indexes.json`

---

## Table des matières

1. [Règles Firestore](#1-règles-firestore)
2. [Règles Firebase Storage](#2-règles-firebase-storage)
3. [Index Firestore](#3-index-firestore)

---

## 1. Règles Firestore

### 1.1 Collection `caisseSpecialeDemands`

Les règles ci-dessous doivent être intégrées dans `firestore.rules` (section existante à mettre à jour).

#### Contexte

- **Lecture** : Admin uniquement (page `/caisse-speciale/demandes`, détails, exports)
- **Création** : Admin uniquement (page `/caisse-speciale/demandes/nouvelle` – C.6)
- **Mise à jour** : Admin uniquement (Accepter, Refuser, Réouvrir, Convertir)
- **Suppression** : Admin uniquement, demandes `REJECTED` uniquement

#### Champs obligatoires à la création (V2)

| Champ | Type | Contraintes |
|-------|------|-------------|
| `memberId` | string | Requis |
| `contractType` | string | `'INDIVIDUAL'` uniquement |
| `caisseType` | string | `'STANDARD'`, `'JOURNALIERE'`, `'LIBRE'` |
| `monthlyAmount` | number | 1000–10 000 000 |
| `monthsPlanned` | number | 1–120 |
| `desiredDate` | string | Non vide |
| `status` | string | `'PENDING'` |
| `createdBy` | string | `request.auth.uid` |
| `createdAt` | timestamp | Requis |
| `updatedAt` | timestamp | Requis |

#### Champs optionnels à la création (V2 – C.0, C.8)

| Champ | Type | Description |
|-------|------|-------------|
| `emergencyContact` | map | Contact d'urgence (lastName, firstName, phone1, phone2, relationship, typeId, idNumber, documentPhotoUrl) |
| `searchableText` | string | Variante nom prénom matricule (recherche) |
| `searchableTextFirstNameFirst` | string | Variante prénom nom matricule |
| `searchableTextMatriculeFirst` | string | Variante matricule prénom nom |

#### Champs de traçabilité (update)

| Action | Champs enregistrés |
|--------|--------------------|
| Accepter | `approvedBy`, `approvedAt`, `approvedByName`, `approveReason` |
| Refuser | `rejectedBy`, `rejectedAt`, `rejectedByName`, `rejectReason` |
| Réouvrir | `reopenedBy`, `reopenedAt`, `reopenedByName`, `reopenReason` |
| Convertir | `convertedBy`, `convertedAt`, `convertedByName`, `contractId` |

#### Règles Firestore (extrait à intégrer)

```javascript
// ==========================================
// DEMANDES CAISSE SPÉCIALE (CAISSE SPECIALE DEMANDS) - V2
// ==========================================
// Page /caisse-speciale/demandes - Gestion des demandes de contrats CS
// Workflows : ListerDemandes, FiltrerDemandes, RechercherDemandes, CreerDemande,
//            AccepterDemande, RefuserDemande, ReouvrirDemande, ConvertirContrat,
//            VoirDetails, ExporterDetailsDemande

match /caisseSpecialeDemands/{demandId} {
  // LECTURE : Admin uniquement
  allow read: if isAdmin();
  
  // CRÉATION : Admin uniquement avec validation des champs requis (V2)
  allow create: if isAdmin() &&
    // Champs obligatoires
    request.resource.data.memberId is string &&
    request.resource.data.memberId.size() > 0 &&
    request.resource.data.contractType == 'INDIVIDUAL' &&
    request.resource.data.caisseType is string &&
    request.resource.data.caisseType in ['STANDARD', 'JOURNALIERE', 'LIBRE'] &&
    request.resource.data.monthlyAmount is number &&
    request.resource.data.monthlyAmount >= 1000 &&
    request.resource.data.monthlyAmount <= 10000000 &&
    request.resource.data.monthsPlanned is number &&
    request.resource.data.monthsPlanned >= 1 &&
    request.resource.data.monthsPlanned <= 120 &&
    request.resource.data.desiredDate is string &&
    request.resource.data.desiredDate.size() > 0 &&
    request.resource.data.status == 'PENDING' &&
    request.resource.data.createdBy is string &&
    request.resource.data.createdBy == request.auth.uid &&
    request.resource.data.createdAt is timestamp &&
    request.resource.data.updatedAt is timestamp &&
    // Pas de champs de décision à la création
    !('approvedBy' in request.resource.data) &&
    !('approvedAt' in request.resource.data) &&
    !('rejectedBy' in request.resource.data) &&
    !('rejectedAt' in request.resource.data) &&
    !('reopenedBy' in request.resource.data) &&
    !('reopenedAt' in request.resource.data) &&
    !('convertedBy' in request.resource.data) &&
    !('convertedAt' in request.resource.data) &&
    !('contractId' in request.resource.data);
  
  // MISE À JOUR : Admin uniquement (approbation, refus, réouverture, conversion)
  allow update: if isAdmin();
  
  // SUPPRESSION : Admin uniquement (seulement demandes REJECTED)
  allow delete: if isAdmin() && resource.data.status == 'REJECTED';
}
```

#### Validation optionnelle du contact d'urgence (C.0 – à activer quand implémenté)

Si le contact d'urgence devient obligatoire à la création :

```javascript
// Ajouter dans allow create :
request.resource.data.emergencyContact is map &&
request.resource.data.emergencyContact.lastName is string &&
request.resource.data.emergencyContact.lastName.size() > 0 &&
request.resource.data.emergencyContact.phone1 is string &&
request.resource.data.emergencyContact.phone1.size() > 0 &&
request.resource.data.emergencyContact.relationship is string &&
request.resource.data.emergencyContact.relationship.size() > 0 &&
request.resource.data.emergencyContact.typeId is string &&
request.resource.data.emergencyContact.typeId.size() > 0 &&
request.resource.data.emergencyContact.idNumber is string &&
request.resource.data.emergencyContact.idNumber.size() > 0;
```

---

## 2. Règles Firebase Storage

### 2.1 Chemins existants réutilisés

| Chemin | Usage | Règles actuelles |
|--------|-------|------------------|
| `emergency-contacts/{fileName}` | Photos pièces d'identité contacts d'urgence (Caisse Spéciale) | Lecture/écriture admin, image max 5 MB |
| `contracts/{contractId}/{fileName}` | PDFs contrats CS signés | Lecture/écriture admin, PDF max 10 MB |
| `contract-documents/{contractId}/{refundId}/{fileName}` | PDFs remboursements CS | Lecture/écriture admin, PDF max 10 MB |
| `caisse/{contractId}/payments/...` | Preuves de paiement CS | Lecture/écriture admin, image max 5 MB |

### 2.2 Règles Storage pour Demandes CS (V2)

Le formulaire de création de demande (C.0) inclut un contact d'urgence avec photo de pièce d'identité. Le chemin `emergency-contacts/{fileName}` est déjà défini pour Caisse Spéciale et peut être réutilisé pour les demandes.

**Option A – Réutiliser `emergency-contacts`** (recommandé)

Les photos uploadées lors de la création de demande utilisent le même chemin que les contrats CS. Aucune modification des règles Storage n’est nécessaire.

**Option B – Chemin dédié aux demandes**

Si l’on souhaite isoler les photos des demandes :

```javascript
// ============================================
// CAISSE SPÉCIALE - CONTACTS D'URGENCE (DEMANDES)
// ============================================
// Photos de pièces d'identité des contacts d'urgence lors de la création de demande
// Chemin : caisse-speciale-demandes/emergency-contacts/{demandId}/{fileName}

match /caisse-speciale-demandes/emergency-contacts/{demandId}/{fileName} {
  // Lecture : Admins uniquement (documents sensibles)
  allow read: if isAdmin();
  
  // Écriture : Admins uniquement avec validation
  // - Type : image (jpeg, jpg, png, webp)
  // - Taille max : 5 MB
  allow write: if isAdmin() && 
    request.resource.contentType.matches('image/(jpeg|jpg|png|webp)') &&
    request.resource.size < 5 * 1024 * 1024;
  
  // Suppression : Admin uniquement
  allow delete: if isAdmin();
}
```

### 2.3 Récapitulatif Storage

| Chemin | Création demande | Contrat CS | Règles |
|--------|------------------|------------|--------|
| `emergency-contacts/{fileName}` | ✅ (C.0) | ✅ | Admin, image 5 MB |
| `contracts/{contractId}/{fileName}` | — | ✅ | Admin, PDF 10 MB |
| `contract-documents/{contractId}/{refundId}/{fileName}` | — | ✅ | Admin, PDF 10 MB |

---

## 3. Index Firestore

### 3.1 Requêtes supportées (d’après les diagrammes)

| Workflow | Requête | Champs utilisés |
|----------|---------|-----------------|
| ListerDemandes | Liste paginée par statut | `status`, `createdAt` DESC |
| FiltrerDemandes | Filtre statut + type caisse + dates | `status`, `caisseType`, `createdAt` |
| RechercherDemandes (C.8) | Recherche nom/prénom/matricule | `searchableText*`, `status`, `createdAt` |
| Stats | Agrégation par statut | `status` |
| Détails par membre | Demandes d’un membre | `memberId`, `createdAt` |

### 3.2 Index à ajouter dans `firestore.indexes.json`

Ajouter les blocs suivants dans le tableau `"indexes"` :

```json
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "caisseType", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "memberId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "caisseType", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "searchableText", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" },
    { "fieldPath": "__name__", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "searchableText", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" },
    { "fieldPath": "__name__", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "searchableTextFirstNameFirst", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" },
    { "fieldPath": "__name__", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "searchableTextFirstNameFirst", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" },
    { "fieldPath": "__name__", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "searchableTextMatriculeFirst", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" },
    { "fieldPath": "__name__", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "searchableTextMatriculeFirst", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" },
    { "fieldPath": "__name__", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "searchableText", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" },
    { "fieldPath": "__name__", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "searchableText", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" },
    { "fieldPath": "__name__", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "searchableTextFirstNameFirst", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" },
    { "fieldPath": "__name__", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "searchableTextFirstNameFirst", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" },
    { "fieldPath": "__name__", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "searchableTextMatriculeFirst", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" },
    { "fieldPath": "__name__", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "searchableTextMatriculeFirst", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" },
    { "fieldPath": "__name__", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "caisseType", "order": "ASCENDING" },
    { "fieldPath": "searchableText", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" },
    { "fieldPath": "__name__", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "caisseType", "order": "ASCENDING" },
    { "fieldPath": "searchableTextFirstNameFirst", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" },
    { "fieldPath": "__name__", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "caisseSpecialeDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "caisseType", "order": "ASCENDING" },
    { "fieldPath": "searchableTextMatriculeFirst", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" },
    { "fieldPath": "__name__", "order": "DESCENDING" }
  ]
}
```

### 3.3 Correspondance index ↔ workflow

| Index | Workflow |
|-------|----------|
| `status` + `createdAt` | ListerDemandes, FiltrerDemandes (onglets) |
| `status` + `caisseType` + `createdAt` | FiltrerDemandes (combinaison) |
| `memberId` + `createdAt` | Demandes d’un membre |
| `caisseType` + `createdAt` | FiltrerDemandes (type caisse seul) |
| `searchableText*` + `createdAt` | RechercherDemandes (C.8 – 3 variantes) |
| `status` + `searchableText*` + `createdAt` | Recherche + filtre statut |
| `status` + `caisseType` + `searchableText*` + `createdAt` | Recherche + statut + type caisse |

### 3.4 Déploiement des index

```bash
firebase deploy --only firestore:indexes
```

Ou via la console Firebase : Firestore → Indexes → Créer un index (Firebase peut proposer les index manquants lors des premières requêtes).

---

## Annexe : Champs `searchableText` (C.8)

Pour la recherche par nom, prénom ou matricule, trois champs dénormalisés sont utilisés (comme Caisse Imprévue) :

| Champ | Format | Exemple | Recherche |
|-------|--------|---------|-----------|
| `searchableText` | `lastName firstName matricule` | `ndong alain owono 8438.mk.160126` | "ndong", "ndong alain" |
| `searchableTextFirstNameFirst` | `firstName lastName matricule` | `alain owono ndong 8438.mk.160126` | "alain", "alain owono" |
| `searchableTextMatriculeFirst` | `matricule firstName lastName` | `8438.mk.160126 alain owono ndong` | "8438", "8438.mk" |

Génération via `generateAllDemandSearchableTexts()` dans `src/utils/demandSearchableText.ts`.

---

*Dernière mise à jour : 2026-01-30*
