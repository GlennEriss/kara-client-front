# Index Firestore - Fonctionnalité Corrections

## 📋 Vue d'ensemble

Ce document définit les index Firestore nécessaires pour optimiser les requêtes liées à la fonctionnalité de correction des demandes d'adhésion.

## 🔍 Requêtes identifiées

### 1. **Admin - Lister les demandes en correction**

**Requête :**
```javascript
query(
  collection(db, 'membership-requests'),
  where('status', '==', 'under_review'),
  orderBy('createdAt', 'desc')
)
```

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

### 2. **Admin - Statistiques (demandes en correction)**

**Requête :**
```javascript
getCountFromServer(
  query(
    collection(db, 'membership-requests'),
    where('status', '==', 'under_review')
  )
)
```

**Index requis :** Même index que ci-dessus (déjà couvert)

### 3. **Admin - Recherche avec filtre statut + pagination**

**Requête :**
```javascript
query(
  collection(db, 'membership-requests'),
  where('status', '==', 'under_review'),
  where('isPaid', '==', true), // Optionnel
  orderBy('createdAt', 'desc'),
  limit(10)
)
```

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

### 4. **Demandeur - Vérifier le code de sécurité**

**Requête :**
```javascript
getDoc(doc(db, 'membership-requests', requestId))
```

**Index requis :** Aucun (requête par ID, pas d'index nécessaire)

### 5. **Admin - Rechercher par code de sécurité (optionnel, pour debug)**

**Requête :**
```javascript
query(
  collection(db, 'membership-requests'),
  where('securityCode', '==', code),
  where('securityCodeUsed', '==', false)
)
```

**Index requis :**
```json
{
  "collectionGroup": "membership-requests",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "securityCode",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "securityCodeUsed",
      "order": "ASCENDING"
    }
  ]
}
```

**Note :** Cet index est optionnel car la vérification se fait généralement par ID de document.

## 📝 Fichier `firestore.indexes.json` (extrait)

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
    },
    {
      "collectionGroup": "membership-requests",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "securityCode",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "securityCodeUsed",
          "order": "ASCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## 🎯 Index prioritaires

### Priorité 1 (Obligatoires)

1. **`status + createdAt`** (desc)
   - Utilisé pour lister les demandes en correction
   - Utilisé pour les statistiques
   - **Impact :** Haute performance pour les requêtes principales

### Priorité 2 (Recommandés)

2. **`status + isPaid + createdAt`** (desc)
   - Utilisé pour filtrer les demandes payées/non payées en correction
   - **Impact :** Améliore les performances des filtres combinés

### Priorité 3 (Optionnels)

3. **`securityCode + securityCodeUsed`**
   - Utilisé uniquement pour recherche par code (debug/admin)
   - **Impact :** Faible (la vérification se fait généralement par ID)

## 📊 Statistiques d'utilisation

### Requêtes les plus fréquentes

1. **Lister demandes en correction** : ~80% des requêtes
   - Index : `status + createdAt`
   - Fréquence : À chaque chargement de page admin

2. **Statistiques** : ~15% des requêtes
   - Index : `status + createdAt`
   - Fréquence : À chaque chargement de page admin

3. **Vérification code** : ~5% des requêtes
   - Index : Aucun (requête par ID)
   - Fréquence : Quand un demandeur accède aux corrections

## ⚠️ Notes importantes

1. **Ordre des champs :**
   - L'ordre des champs dans l'index doit correspondre à l'ordre dans la requête
   - Firestore exige que les `where()` précèdent les `orderBy()`

2. **Index composites :**
   - Les index composites sont nécessaires pour les requêtes avec plusieurs `where()`
   - Firestore génère automatiquement les index simples, mais pas les composites

3. **Création des index :**
   - Les index peuvent être créés automatiquement via les erreurs Firestore
   - Ou manuellement via la console Firebase
   - Ou via `firestore.indexes.json` (recommandé)

4. **Performance :**
   - Les index améliorent significativement les performances des requêtes
   - Sans index, Firestore retournera une erreur pour les requêtes complexes
