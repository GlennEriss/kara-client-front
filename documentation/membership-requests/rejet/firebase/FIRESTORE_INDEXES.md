# Index Firestore - Fonctionnalité Rejet

## 📋 Vue d'ensemble

Ce document définit les index Firestore nécessaires pour optimiser les requêtes liées à la fonctionnalité de rejet d'une demande d'adhésion et les actions post-rejet.

---

## 🔍 Requêtes Identifiées

### 1. Admin - Lister les demandes rejetées

**Requête :**
```javascript
query(
  collection(db, 'membership-requests'),
  where('status', '==', 'rejected'),
  orderBy('createdAt', 'desc')
)
```

**Utilisation** : Afficher la liste des demandes rejetées dans l'interface admin

**Index requis :**
```json
{
  "collectionGroup": "membership-requests",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "status",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

---

### 2. Admin - Statistiques (demandes rejetées)

**Requête :**
```javascript
getCountFromServer(
  query(
    collection(db, 'membership-requests'),
    where('status', '==', 'rejected')
  )
)
```

**Utilisation** : Calculer le nombre de demandes rejetées pour les statistiques

**Index requis :** Même index que ci-dessus (déjà couvert)

---

### 3. Admin - Liste des demandes rejetées avec pagination

**Requête :**
```javascript
query(
  collection(db, 'membership-requests'),
  where('status', '==', 'rejected'),
  orderBy('createdAt', 'desc'),
  limit(10),
  startAfter(lastDoc)
)
```

**Utilisation** : Pagination de la liste des demandes rejetées

**Index requis :** Même index que ci-dessus (déjà couvert)

---

### 4. Admin - Recherche avec filtre statut + paiement + pagination

**Requête :**
```javascript
query(
  collection(db, 'membership-requests'),
  where('status', '==', 'rejected'),
  where('isPaid', '==', true),
  orderBy('createdAt', 'desc'),
  limit(10)
)
```

**Utilisation** : Filtrer les demandes rejetées par paiement

**Index requis :**
```json
{
  "collectionGroup": "membership-requests",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "status",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "isPaid",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

---

### 5. Admin - Recherche avec filtre statut + paiement (non payé) + pagination

**Requête :**
```javascript
query(
  collection(db, 'membership-requests'),
  where('status', '==', 'rejected'),
  where('isPaid', '==', false),
  orderBy('createdAt', 'desc'),
  limit(10)
)
```

**Utilisation** : Filtrer les demandes rejetées non payées

**Index requis :** Même index que ci-dessus (déjà couvert)

---

### 6. Admin - Recherche avec filtre par admin qui a rejeté

**Requête :**
```javascript
query(
  collection(db, 'membership-requests'),
  where('status', '==', 'rejected'),
  where('processedBy', '==', adminId),
  orderBy('processedAt', 'desc'),
  limit(10)
)
```

**Utilisation** : Voir les demandes rejetées par un admin spécifique (audit)

**Index requis :**
```json
{
  "collectionGroup": "membership-requests",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "status",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "processedBy",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "processedAt",
      "order": "DESCENDING"
    }
  ]
}
```

**Note** : Index optionnel si cette fonctionnalité d'audit est nécessaire

---

### 7. Admin - Recherche avec filtre par date de rejet

**Requête :**
```javascript
query(
  collection(db, 'membership-requests'),
  where('status', '==', 'rejected'),
  where('processedAt', '>=', startDate),
  where('processedAt', '<=', endDate),
  orderBy('processedAt', 'desc'),
  limit(10)
)
```

**Utilisation** : Filtrer les demandes rejetées par période (rapports)

**Index requis :**
```json
{
  "collectionGroup": "membership-requests",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "status",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "processedAt",
      "order": "ASCENDING"
    }
  ]
}
```

**Note** : Index optionnel si cette fonctionnalité de rapports est nécessaire

---

## 📊 Index Obligatoires (Priorité P0)

| Index | Champs | Utilisation |
|-------|--------|-------------|
| **Index 1** | `status` (ASC) + `createdAt` (DESC) | Liste des demandes rejetées |
| **Index 2** | `status` (ASC) + `isPaid` (ASC) + `createdAt` (DESC) | Filtrage par paiement |

---

## 📊 Index Optionnels (Priorité P1-P2)

| Index | Champs | Utilisation | Priorité |
|-------|--------|-------------|----------|
| **Index 3** | `status` (ASC) + `processedBy` (ASC) + `processedAt` (DESC) | Audit par admin | P1 |
| **Index 4** | `status` (ASC) + `processedAt` (ASC) | Rapports par période | P2 |

---

## 📋 Format JSON pour firestore.indexes.json

### Index Obligatoires

```json
{
  "indexes": [
    {
      "collectionGroup": "membership-requests",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "membership-requests",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "isPaid",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

### Index Optionnels (si fonctionnalités d'audit/rapports nécessaires)

```json
{
  "indexes": [
    {
      "collectionGroup": "membership-requests",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "processedBy",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "processedAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "membership-requests",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "processedAt",
          "order": "ASCENDING"
        }
      ]
    }
  ]
}
```

---

## 🔍 Requêtes sans Index Nécessaire

### Requête par ID

**Requête :**
```javascript
getDoc(doc(db, 'membership-requests', requestId))
```

**Index requis :** Aucun (requête par ID, pas d'index nécessaire)

**Utilisation** : Récupérer une demande spécifique par son ID

---

## ⚠️ Notes Importantes

1. **Index obligatoires** : Les index 1 et 2 sont **obligatoires** pour le bon fonctionnement de la fonctionnalité de rejet.

2. **Index optionnels** : Les index 3 et 4 sont **optionnels** et dépendent des fonctionnalités d'audit/rapports nécessaires.

3. **Ordre des champs** : L'ordre des champs dans l'index doit correspondre à l'ordre des `where()` et `orderBy()` dans la requête.

4. **Performance** : Les index améliorent significativement les performances des requêtes complexes.

5. **Création d'index** : Firestore suggère automatiquement la création d'index si une requête nécessite un index manquant.

---

## 🚀 Déploiement

### 1. Ajouter les index dans firestore.indexes.json

```bash
# Voir la section "Format JSON" ci-dessus
```

### 2. Déployer les index

```bash
firebase deploy --only firestore:indexes
```

### 3. Vérifier la création

Les index peuvent prendre quelques minutes à être créés. Vérifier dans la console Firebase :
- Firestore → Indexes → Vérifier l'état (Building, Enabled, etc.)

---

## 📊 Récapitulatif des Index Nécessaires

| Index | Champs | Priorité | Obligatoire |
|-------|--------|----------|-------------|
| **1** | `status` + `createdAt` | P0 | ✅ **Oui** |
| **2** | `status` + `isPaid` + `createdAt` | P0 | ✅ **Oui** |
| **3** | `status` + `processedBy` + `processedAt` | P1 | ⚠️ **Optionnel** |
| **4** | `status` + `processedAt` | P2 | ⚠️ **Optionnel** |

---

## 📚 Références

- **Repository** : `src/domains/memberships/repositories/MembershipRepositoryV2.ts`
- **Flux de rejet** : `../FLUX_REJET.md`
- **Actions post-rejet** : `../ACTIONS_POST_REJET.md`
- [Documentation Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Documentation Firestore Query Limitations](https://firebase.google.com/docs/firestore/query-data/queries)
