# Index Firestore - Clôture de contrat (Crédit spéciale)

> Index Firestore nécessaires pour le use case de clôture de contrat

## 📋 Vue d'ensemble

Le flux de clôture utilise principalement des opérations par ID (lecture et mise à jour directe). Les index existants pour `creditContracts` couvrent déjà les requêtes de liste et de filtrage.

## 🎯 Requêtes du flux de clôture

| Opération | Collection | Requête | Index requis |
|-----------|------------|---------|--------------|
| getContractById | creditContracts | doc(id) | Aucun (lecture par ID) |
| updateContract | creditContracts | updateDoc(id, data) | Aucun (écriture par ID) |
| createDocument | documents | setDoc(id, data) | Aucun (création) |
| getDocumentsByContractId | documents | where("contractId", "==", id) | Aucun (index single-field auto) |

## ✅ Index existants pour `creditContracts`

Les index suivants sont déjà définis dans `firestore.indexes.json` et couvrent les requêtes de liste/filtrage utilisées par le flux (ex. liste des contrats, filtres par statut DISCHARGED/CLOSED) :

### 1. Statut + Date de création

**Requête** : Liste des contrats filtrés par statut (ex. DISCHARGED, CLOSED), triés par date

```typescript
query(
  collection(db, 'creditContracts'),
  where('status', '==', 'DISCHARGED'),
  orderBy('createdAt', 'desc')
)
```

**Index** (déjà présent) :

```json
{
  "collectionGroup": "creditContracts",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

### 2. Statut + Type de crédit + Date

**Requête** : Liste des contrats filtrés par statut et type, triés par date

```typescript
query(
  collection(db, 'creditContracts'),
  where('status', '==', 'CLOSED'),
  where('creditType', '==', 'SPECIALE'),
  orderBy('createdAt', 'desc')
)
```

**Index** (déjà présent) :

```json
{
  "collectionGroup": "creditContracts",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "creditType", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

### 3. Statut + Prochaine échéance

**Requête** : Contrats actifs ou partiels triés par prochaine échéance

```typescript
query(
  collection(db, 'creditContracts'),
  where('status', '==', 'ACTIVE'),
  orderBy('nextDueAt', 'desc')
)
```

**Index** (déjà présent) :

```json
{
  "collectionGroup": "creditContracts",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "nextDueAt", "order": "DESCENDING" }
  ]
}
```

## 📁 Index pour `documents`

### Requête getDocumentsByContractId

```typescript
query(
  collection(db, 'documents'),
  where('contractId', '==', contractId)
)
```

**Index** : Aucun index composite requis. Firestore indexe automatiquement les champs utilisés dans des clauses d’égalité.

### Requête avec tri par date (optionnel)

Si on ajoute un tri par date pour les documents d’un contrat :

```typescript
query(
  collection(db, 'documents'),
  where('contractId', '==', contractId),
  orderBy('createdAt', 'desc')
)
```

**Index à ajouter** (si cette requête est implémentée) :

```json
{
  "collectionGroup": "documents",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "contractId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Statut** : Non requis pour le flux actuel (getDocumentsByContractId ne trie pas).

## 📊 Résumé

| Index | Collection | Statut | Priorité |
|-------|------------|--------|----------|
| status + createdAt | creditContracts | ✅ Présent | Couvert |
| status + creditType + createdAt | creditContracts | ✅ Présent | Couvert |
| status + nextDueAt | creditContracts | ✅ Présent | Couvert |
| clientId + createdAt | creditContracts | ✅ Présent | Couvert |
| guarantorId + createdAt | creditContracts | ✅ Présent | Couvert |
| contractId + createdAt | documents | ❌ Optionnel | Si tri par date ajouté |

## 🚀 Déploiement

Aucun nouvel index n’est nécessaire pour le flux de clôture actuel. Les index existants suffisent.

Pour vérifier ou créer des index manquants :

```bash
# Lister les index
firebase firestore:indexes

# Déployer les index (si modifications)
firebase deploy --only firestore:indexes
```

Si Firestore signale un index manquant lors d’une requête, l’erreur contient un lien vers la console pour créer l’index.

---

## ⚠️ Notes

- **Ordre des champs** : L’ordre des champs dans l’index doit correspondre à celui de la requête.
- **Temps de création** : Les index composites peuvent prendre quelques minutes à être créés.
- **Coûts** : Chaque index a un coût de stockage et de maintenance.

---

**Références** : [CreditContractRepository](../../../../src/repositories/credit-speciale/CreditContractRepository.ts) | [DocumentRepository](../../../../src/repositories/documents/DocumentRepository.ts) | [firestore.indexes.json](../../../../firestore.indexes.json)
