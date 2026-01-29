# Index Firestore - Recherche des Demandes (searchableText)

> Index composites requis pour la recherche paginée avec `searchableText` (nom, prénom, matricule).
> **Référence** : Diagrammes `activite/RechercherDemandes.puml` et `sequence/SEQ_RechercherDemandes.puml`

## 📋 Vue d'ensemble

La recherche utilise des requêtes Firestore avec :
- **Equality** : `where('status', '==', X)`, `where('paymentFrequency', '==', Y)`
- **Range** : `where('searchableText', '>=', Z)` et `where('searchableText', '<=', Z + '\uf8ff')`
- **OrderBy** : `orderBy('searchableText', 'asc')` (obligatoire pour la range), puis tri secondaire (date ou alphabétique)
- **Pagination** : `limit(pageSize)` + `startAfter(cursor)` → nécessite `__name__` dans l'index

**Règle Firestore** : Ordre des champs = equality d'abord, puis range (searchableText), puis orderBy, puis `__name__`.

---

## 🎯 Matrice des combinaisons

| Filtres | Tri | Index requis |
|---------|-----|--------------|
| Aucun (tab Toutes) | Date asc | `searchableText`, `createdAt` asc, `__name__` |
| Aucun (tab Toutes) | Date desc | `searchableText`, `createdAt` desc, `__name__` |
| Aucun (tab Toutes) | A-Z | `searchableText`, `memberLastName`, `memberFirstName` asc, `__name__` |
| Aucun (tab Toutes) | Z-A | `searchableText`, `memberLastName`, `memberFirstName` desc, `__name__` |
| status | Date asc/desc | `status`, `searchableText`, `createdAt`, `__name__` |
| status | A-Z / Z-A | `status`, `searchableText`, `memberLastName`, `memberFirstName`, `__name__` |
| status + paymentFrequency | Date asc/desc | `status`, `paymentFrequency`, `searchableText`, `createdAt`, `__name__` |
| status + paymentFrequency | A-Z / Z-A | `status`, `paymentFrequency`, `searchableText`, `memberLastName`, `memberFirstName`, `__name__` |
| paymentFrequency (tab Toutes) | Date asc/desc | `paymentFrequency`, `searchableText`, `createdAt`, `__name__` |
| paymentFrequency (tab Toutes) | A-Z / Z-A | `paymentFrequency`, `searchableText`, `memberLastName`, `memberFirstName`, `__name__` |

---

## 📦 Index à ajouter

### 1. Recherche seule (tab "Toutes", sans filtre statut/fréquence)

**Requête** : `where('searchableText', '>=', X)`, `where('searchableText', '<=', X+'\uf8ff')`, `orderBy('searchableText', 'asc')`, `orderBy('createdAt', ...)`, `limit(N)`, `startAfter(doc)`

| Tri | Champs index |
|-----|--------------|
| Date asc | `searchableText` asc, `createdAt` asc, `__name__` asc |
| Date desc | `searchableText` asc, `createdAt` desc, `__name__` desc |
| A-Z | `searchableText` asc, `memberLastName` asc, `memberFirstName` asc, `__name__` asc |
| Z-A | `searchableText` asc, `memberLastName` desc, `memberFirstName` desc, `__name__` desc |

### 2. Recherche + statut (tab En attente, Acceptées, etc.)

**Requête** : `where('status', '==', X)`, `where('searchableText', '>=', Y)`, `where('searchableText', '<=', Y+'\uf8ff')`, `orderBy('searchableText', 'asc')`, `orderBy(...)`, `limit(N)`, `startAfter(doc)`

| Tri | Champs index |
|-----|--------------|
| Date asc | `status`, `searchableText`, `createdAt` asc, `__name__` asc |
| Date desc | `status`, `searchableText`, `createdAt` desc, `__name__` desc |
| A-Z | `status`, `searchableText`, `memberLastName` asc, `memberFirstName` asc, `__name__` asc |
| Z-A | `status`, `searchableText`, `memberLastName` desc, `memberFirstName` desc, `__name__` desc |

### 3. Recherche + statut + fréquence

**Requête** : `where('status', '==', X)`, `where('paymentFrequency', '==', Y)`, `where('searchableText', '>=', Z)`, ...

| Tri | Champs index |
|-----|--------------|
| Date asc | `status`, `paymentFrequency`, `searchableText`, `createdAt` asc, `__name__` asc |
| Date desc | `status`, `paymentFrequency`, `searchableText`, `createdAt` desc, `__name__` desc |
| A-Z | `status`, `paymentFrequency`, `searchableText`, `memberLastName` asc, `memberFirstName` asc, `__name__` asc |
| Z-A | `status`, `paymentFrequency`, `searchableText`, `memberLastName` desc, `memberFirstName` desc, `__name__` desc |

### 4. Recherche + fréquence (tab "Toutes" avec filtre fréquence)

**Requête** : `where('paymentFrequency', '==', X)`, `where('searchableText', '>=', Y)`, ...

| Tri | Champs index |
|-----|--------------|
| Date asc | `paymentFrequency`, `searchableText`, `createdAt` asc, `__name__` asc |
| Date desc | `paymentFrequency`, `searchableText`, `createdAt` desc, `__name__` desc |
| A-Z | `paymentFrequency`, `searchableText`, `memberLastName` asc, `memberFirstName` asc, `__name__` asc |
| Z-A | `paymentFrequency`, `searchableText`, `memberLastName` desc, `memberFirstName` desc, `__name__` desc |

---

## 🔗 Intégration

Les index sont définis dans `indexes.recherche.json` dans ce dossier. Pour les intégrer au projet :

1. Copier les entrées de `indexes.recherche.json` dans le fichier racine `firestore.indexes.json` (tableau `indexes`)
2. Déployer : `firebase deploy --only firestore:indexes`
3. Attendre la construction des index (quelques minutes dans la console Firebase)

---

## 📚 Références

- [RECHERCHE_ANALYSE.md](../RECHERCHE_ANALYSE.md) - Section 5. Index Firestore requis
- [Firestore : Index composites](https://cloud.google.com/firestore/docs/query-data/indexing)
- [Firestore : Requêtes avec inégalités](https://cloud.google.com/firestore/docs/query-data/queries#inequality)
