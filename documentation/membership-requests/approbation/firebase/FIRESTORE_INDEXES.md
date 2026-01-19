# Index Firestore - Approbation d'une Demande d'Adhésion

> Documentation des index Firestore nécessaires pour les requêtes d'approbation

---

## 📋 Vue d'ensemble

Les index Firestore sont nécessaires pour optimiser les requêtes liées à l'approbation :
- Filtrage par `approvedBy` et `approvedAt` pour les rapports
- Requêtes sur `membership-requests` avec statut `approved`
- Requêtes sur `documents` pour les PDFs d'adhésion
- Requêtes sur `subscriptions` pour les abonnements créés

**Fichier** : `firestore.indexes.json`

---

## 🔍 Index Nécessaires

### 1. membership-requests

#### 1.1. Index pour Filtrage par Statut et Date d'Approbation

**Requête** : Filtrer les demandes approuvées par admin et date

```typescript
// Exemple de requête
db.collection('membership-requests')
  .where('status', '==', 'approved')
  .where('approvedBy', '==', adminId)
  .orderBy('approvedAt', 'desc')
```

**Index nécessaire** :
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
      "fieldPath": "approvedBy",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "approvedAt",
      "order": "DESCENDING"
    }
  ]
}
```

**État** : ⚠️ **À ajouter** - Cet index n'existe pas encore dans `firestore.indexes.json`

---

#### 1.2. Index pour Filtrage par Date d'Approbation

**Requête** : Filtrer les demandes approuvées dans une période donnée

```typescript
// Exemple de requête
db.collection('membership-requests')
  .where('status', '==', 'approved')
  .where('approvedAt', '>=', startDate)
  .where('approvedAt', '<=', endDate)
  .orderBy('approvedAt', 'desc')
```

**Index nécessaire** :
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
      "fieldPath": "approvedAt",
      "order": "DESCENDING"
    }
  ]
}
```

**État** : ⚠️ **À ajouter** - Cet index n'existe pas encore dans `firestore.indexes.json`

---

#### 1.3. Index Existant - Statut et Date de Création

**Requête** : Filtrer les demandes par statut et date de création

**Index existant** :
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

**État** : ✅ **Existant** - Cet index existe déjà (lignes 220-231 de `firestore.indexes.json`)

**Utilisation** : Peut être utilisé pour lister les demandes approuvées par date de création.

---

#### 1.4. Index Existant - isPaid, Status et Date de Création

**Requête** : Filtrer les demandes payées et approuvées

**Index existant** :
```json
{
  "collectionGroup": "membership-requests",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "isPaid",
      "order": "ASCENDING"
    },
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

**État** : ✅ **Existant** - Cet index existe déjà (lignes 483-504 de `firestore.indexes.json`)

**Utilisation** : Peut être utilisé pour lister les demandes payées et approuvées.

---

### 2. documents

#### 2.1. Index Existant - Type et MemberId

**Requête** : Filtrer les documents d'adhésion pour un membre

```typescript
// Exemple de requête
db.collection('documents')
  .where('type', '==', 'ADHESION')
  .where('memberId', '==', matricule)
  .orderBy('createdAt', 'desc')
```

**Index existant** :
```json
{
  "collectionGroup": "documents",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "type",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "memberId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

**État** : ✅ **Existant** - Cet index existe déjà (lignes 620-636 de `firestore.indexes.json`)

**Utilisation** : Permet de récupérer les PDFs d'adhésion pour un membre spécifique.

---

#### 2.2. Index Existant - MemberId et Date de Création

**Requête** : Lister tous les documents d'un membre

**Index existant** :
```json
{
  "collectionGroup": "documents",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "memberId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

**État** : ✅ **Existant** - Cet index existe déjà (lignes 606-618 de `firestore.indexes.json`)

**Utilisation** : Permet de lister tous les documents d'un membre, y compris les PDFs d'adhésion.

---

### 3. subscriptions

#### 3.1. Index Existant - UserId et Date de Début

**Requête** : Récupérer les abonnements d'un membre

```typescript
// Exemple de requête
db.collection('subscriptions')
  .where('userId', '==', matricule)
  .orderBy('dateStart', 'desc')
```

**Index existant** :
```json
{
  "collectionGroup": "subscriptions",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "userId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "dateStart",
      "order": "DESCENDING"
    }
  ]
}
```

**État** : ✅ **Existant** - Cet index existe déjà (lignes 592-604 de `firestore.indexes.json`)

**Utilisation** : Permet de récupérer les abonnements créés lors de l'approbation.

---

## 📝 Index à Ajouter

### Index 1 : membership-requests - Status, ApprovedBy, ApprovedAt

**Justification** : Pour les rapports d'approbation par admin

**Index** :
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
      "fieldPath": "approvedBy",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "approvedAt",
      "order": "DESCENDING"
    }
  ]
}
```

**Priorité** : 🔴 **Haute** - Utile pour les rapports et l'audit

---

### Index 2 : membership-requests - Status, ApprovedAt

**Justification** : Pour filtrer les approbations dans une période donnée

**Index** :
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
      "fieldPath": "approvedAt",
      "order": "DESCENDING"
    }
  ]
}
```

**Priorité** : 🟡 **Moyenne** - Utile pour les statistiques et rapports

---

## ✅ Index Déjà Existants

Les index suivants sont déjà présents et peuvent être utilisés pour l'approbation :

1. ✅ `membership-requests` : `status` + `createdAt` (DESC)
2. ✅ `membership-requests` : `isPaid` + `status` + `createdAt` (DESC)
3. ✅ `documents` : `type` + `memberId` + `createdAt` (DESC)
4. ✅ `documents` : `memberId` + `createdAt` (DESC)
5. ✅ `subscriptions` : `userId` + `dateStart` (DESC)

---

## 🚀 Déploiement des Index

### Commandes de Déploiement

```bash
# Déployer tous les index
firebase deploy --only firestore:indexes

# Vérifier les index en attente
firebase firestore:indexes
```

### Vérification

Après déploiement, vérifier dans la console Firebase :
1. Aller dans Firestore → Index
2. Vérifier que les nouveaux index sont créés
3. Attendre que l'état passe à "Enabled"

---

## 📊 Résumé

### ✅ Index Existants (5)
- ✅ `membership-requests` : `status` + `createdAt`
- ✅ `membership-requests` : `isPaid` + `status` + `createdAt`
- ✅ `documents` : `type` + `memberId` + `createdAt`
- ✅ `documents` : `memberId` + `createdAt`
- ✅ `subscriptions` : `userId` + `dateStart`

### ⚠️ Index à Ajouter (2)
- ⚠️ `membership-requests` : `status` + `approvedBy` + `approvedAt` (DESC)
- ⚠️ `membership-requests` : `status` + `approvedAt` (DESC)

---

## 🧪 Tests des Index

### Scénarios à Tester

1. **Requête par admin et date** :
   - Filtrer les demandes approuvées par un admin spécifique
   - Vérifier que la requête utilise l'index

2. **Requête par période** :
   - Filtrer les demandes approuvées dans une période donnée
   - Vérifier que la requête utilise l'index

3. **Requête documents** :
   - Récupérer les PDFs d'adhésion pour un membre
   - Vérifier que la requête utilise l'index

---

## 📖 Références

- **Fichier d'index** : `firestore.indexes.json`
- **Documentation Cloud Function** : `../functions/README.md`
- **Flux d'approbation** : `../FLUX_APPROBATION.md`
- **Documentation Firestore** : https://firebase.google.com/docs/firestore/query-data/indexing
