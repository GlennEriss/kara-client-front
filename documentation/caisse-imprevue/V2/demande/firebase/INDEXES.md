# Index Firestore - Module Demandes Caisse Imprévue V2

> Documentation complète des index Firestore nécessaires pour toutes les requêtes du module V2

## 📋 Vue d'ensemble

Les index Firestore sont **obligatoires** pour les requêtes complexes (filtres multiples, tri, recherche). Sans index, Firestore retournera une erreur indiquant l'index manquant.

## 🎯 Index Requis

### 1. Index pour Pagination par Statut

**Utilisation** : Liste des demandes filtrées par statut, triées par date

**Requête** :
```typescript
query(
  collection('caisseImprevueDemands'),
  where('status', '==', 'PENDING'),
  orderBy('createdAt', 'desc'),
  limit(10)
)
```

**Index** :
```json
{
  "collectionGroup": "caisseImprevueDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Statut** : ✅ Déjà présent dans `firestore.indexes.json` (ligne 926-937)

---

### 2. Index pour Filtre Statut + Fréquence

**Utilisation** : Liste des demandes filtrées par statut ET fréquence de paiement

**Requête** :
```typescript
query(
  collection('caisseImprevueDemands'),
  where('status', '==', 'PENDING'),
  where('paymentFrequency', '==', 'MONTHLY'),
  orderBy('createdAt', 'desc'),
  limit(10)
)
```

**Index** :
```json
{
  "collectionGroup": "caisseImprevueDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "paymentFrequency", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Statut** : ✅ Déjà présent dans `firestore.indexes.json` (ligne 940-969)

---

### 3. Index pour Tri Alphabétique

**Utilisation** : Liste des demandes triées par nom puis prénom

**Requête** :
```typescript
query(
  collection('caisseImprevueDemands'),
  orderBy('memberLastName', 'asc'),
  orderBy('memberFirstName', 'asc'),
  limit(10)
)
```

**Index** :
```json
{
  "collectionGroup": "caisseImprevueDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "memberLastName", "order": "ASCENDING" },
    { "fieldPath": "memberFirstName", "order": "ASCENDING" }
  ]
}
```

**Statut** : ❌ **À AJOUTER** (non présent actuellement)

---

### 4. Index pour Recherche par Nom

**Utilisation** : Recherche de demandes par nom/prénom (préfixe)

**Requête** :
```typescript
query(
  collection('caisseImprevueDemands'),
  where('memberLastName', '>=', 'glenn'),
  where('memberLastName', '<=', 'glenn\uf8ff'),
  orderBy('memberLastName', 'asc'),
  limit(50)
)
```

**Index** :
```json
{
  "collectionGroup": "caisseImprevueDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "memberLastName", "order": "ASCENDING" },
    { "fieldPath": "memberFirstName", "order": "ASCENDING" }
  ]
}
```

**Statut** : ❌ **À AJOUTER** (non présent actuellement)

**Note** : Cet index est le même que l'index #3, donc un seul index suffit pour les deux cas d'usage.

---

### 5. Index pour Filtre Statut + Recherche

**Utilisation** : Recherche de demandes par nom avec filtre statut

**Requête** :
```typescript
query(
  collection('caisseImprevueDemands'),
  where('status', '==', 'PENDING'),
  where('memberLastName', '>=', 'glenn'),
  where('memberLastName', '<=', 'glenn\uf8ff'),
  orderBy('memberLastName', 'asc'),
  limit(50)
)
```

**Index** :
```json
{
  "collectionGroup": "caisseImprevueDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "memberLastName", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Statut** : ❌ **À AJOUTER** (non présent actuellement)

---

### 6. Index pour Filtre par Membre

**Utilisation** : Liste des demandes d'un membre spécifique

**Requête** :
```typescript
query(
  collection('caisseImprevueDemands'),
  where('memberId', '==', 'member-123'),
  orderBy('createdAt', 'desc'),
  limit(10)
)
```

**Index** :
```json
{
  "collectionGroup": "caisseImprevueDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "memberId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Statut** : ✅ Déjà présent dans `firestore.indexes.json` (ligne 972-983)

---

### 7. Index pour Filtre par Forfait

**Utilisation** : Liste des demandes pour un forfait spécifique

**Requête** :
```typescript
query(
  collection('caisseImprevueDemands'),
  where('subscriptionCIID', '==', 'forfait-123'),
  orderBy('createdAt', 'desc'),
  limit(10)
)
```

**Index** :
```json
{
  "collectionGroup": "caisseImprevueDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "subscriptionCIID", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Statut** : ✅ Déjà présent dans `firestore.indexes.json` (ligne 986-997)

---

### 8. Index pour Filtre par Décideur

**Utilisation** : Liste des demandes traitées par un admin spécifique

**Requête** :
```typescript
query(
  collection('caisseImprevueDemands'),
  where('decisionMadeBy', '==', 'admin-123'),
  orderBy('createdAt', 'desc'),
  limit(10)
)
```

**Index** :
```json
{
  "collectionGroup": "caisseImprevueDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "decisionMadeBy", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Statut** : ✅ Déjà présent dans `firestore.indexes.json` (ligne 999-1011)

---

### 9. Index pour Ordre de Priorité (Tab "Toutes")

**Utilisation** : Liste toutes les demandes triées par priorité de statut puis date

**Requête** :
```typescript
// Option A : Utiliser champ calculé priority
query(
  collection('caisseImprevueDemands'),
  orderBy('priority', 'asc'),
  orderBy('createdAt', 'desc'),
  limit(10)
)
```

**Index** :
```json
{
  "collectionGroup": "caisseImprevueDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "priority", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Statut** : ❌ **À AJOUTER** (nécessite ajout du champ `priority` dans les documents)

**Note** : Si on n'ajoute pas le champ `priority`, le tri se fait côté client après récupération (moins performant mais fonctionnel).

---

### 10. Index pour Filtres de Date

**Utilisation** : Liste des demandes créées entre deux dates

**Requête** :
```typescript
query(
  collection('caisseImprevueDemands'),
  where('createdAt', '>=', startDate),
  where('createdAt', '<=', endDate),
  orderBy('createdAt', 'desc'),
  limit(10)
)
```

**Index** :
```json
{
  "collectionGroup": "caisseImprevueDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "createdAt", "order": "ASCENDING" }
  ]
}
```

**Statut** : ✅ **Déjà couvert** par les index existants (createdAt est toujours le dernier champ dans les index)

---

### 11. Index pour Filtre Fréquence seule

**Utilisation** : Liste des demandes filtrées par fréquence de paiement

**Requête** :
```typescript
query(
  collection('caisseImprevueDemands'),
  where('paymentFrequency', '==', 'DAILY'),
  orderBy('createdAt', 'desc'),
  limit(10)
)
```

**Index** :
```json
{
  "collectionGroup": "caisseImprevueDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "paymentFrequency", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Statut** : ✅ Déjà présent dans `firestore.indexes.json` (ligne 940-951)

---

## 📝 Index à Ajouter dans firestore.indexes.json

### Index Manquants

```json
{
  "collectionGroup": "caisseImprevueDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "memberLastName", "order": "ASCENDING" },
    { "fieldPath": "memberFirstName", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "caisseImprevueDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "memberLastName", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Optionnel** (si on ajoute le champ `priority`) :
```json
{
  "collectionGroup": "caisseImprevueDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "priority", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

## 🔍 Index pour Contrats CI (contractsCI)

### 1. Index pour Liste Contrats par Statut

**Utilisation** : Liste des contrats filtrés par statut

**Requête** :
```typescript
query(
  collection('contractsCI'),
  where('status', '==', 'ACTIVE'),
  orderBy('createdAt', 'desc'),
  limit(10)
)
```

**Index** :
```json
{
  "collectionGroup": "contractsCI",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Statut** : ✅ Déjà présent dans `firestore.indexes.json` (ligne 1014-1025)

---

### 2. Index pour Filtre Statut + Fréquence (Contrats)

**Utilisation** : Liste des contrats filtrés par statut ET fréquence

**Requête** :
```typescript
query(
  collection('contractsCI'),
  where('status', '==', 'ACTIVE'),
  where('paymentFrequency', '==', 'MONTHLY'),
  orderBy('createdAt', 'desc'),
  limit(10)
)
```

**Index** :
```json
{
  "collectionGroup": "contractsCI",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "paymentFrequency", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Statut** : ✅ Déjà présent dans `firestore.indexes.json` (ligne 1042-1057)

---

## 📊 Résumé des Index

| Index | Collection | Statut | Priorité |
|-------|-----------|-------|----------|
| Statut + Date | caisseImprevueDemands | ✅ Présent | Critique |
| Statut + Fréquence + Date | caisseImprevueDemands | ✅ Présent | Critique |
| Membre + Date | caisseImprevueDemands | ✅ Présent | Important |
| Forfait + Date | caisseImprevueDemands | ✅ Présent | Important |
| Décideur + Date | caisseImprevueDemands | ✅ Présent | Optionnel |
| Fréquence + Date | caisseImprevueDemands | ✅ Présent | Important |
| **Nom + Prénom** | caisseImprevueDemands | ❌ **À AJOUTER** | **Critique** |
| **Statut + Nom + Date** | caisseImprevueDemands | ❌ **À AJOUTER** | **Critique** |
| **Priority + Date** | caisseImprevueDemands | ❌ **À AJOUTER** | Optionnel |
| Statut + Date (Contrats) | contractsCI | ✅ Présent | Important |
| Statut + Fréquence + Date (Contrats) | contractsCI | ✅ Présent | Important |

---

## 🚀 Déploiement des Index

### Méthode 1 : Via Firebase Console

1. Accéder à Firebase Console → Firestore → Indexes
2. Cliquer sur "Créer un index"
3. Sélectionner la collection `caisseImprevueDemands`
4. Ajouter les champs dans l'ordre exact
5. Définir l'ordre (ASCENDING/DESCENDING)
6. Cliquer sur "Créer"

### Méthode 2 : Via firestore.indexes.json

1. Ajouter les index manquants dans `firestore.indexes.json`
2. Déployer avec :
   ```bash
   firebase deploy --only firestore:indexes
   ```

### Méthode 3 : Via CLI Firebase

```bash
# Ajouter les index manquants
firebase firestore:indexes

# Déployer
firebase deploy --only firestore:indexes
```

---

## ⚠️ Notes Importantes

### Ordre des Champs

**CRITIQUE** : L'ordre des champs dans l'index doit correspondre **exactement** à l'ordre dans la requête Firestore.

**Exemple correct** :
```typescript
// Requête
where('status', '==', 'PENDING')
orderBy('createdAt', 'desc')

// Index (ordre correct)
fields: [
  { "fieldPath": "status", "order": "ASCENDING" },
  { "fieldPath": "createdAt", "order": "DESCENDING" }
]
```

**Exemple incorrect** :
```typescript
// Requête
where('status', '==', 'PENDING')
orderBy('createdAt', 'desc')

// Index (ordre incorrect - ne fonctionnera pas)
fields: [
  { "fieldPath": "createdAt", "order": "DESCENDING" },
  { "fieldPath": "status", "order": "ASCENDING" }
]
```

### Règle d'Inégalité

Firestore ne permet qu'**une seule clause d'inégalité** (`<`, `<=`, `>`, `>=`) par requête. Pour les recherches par préfixe, on utilise :
- `where('memberLastName', '>=', query)`
- `where('memberLastName', '<=', query + '\uf8ff')`

Ces deux clauses nécessitent un index sur `memberLastName`.

### Temps de Création

- **Index simple** : 1-2 minutes
- **Index composite** : 2-5 minutes
- **Index avec beaucoup de données** : 5-15 minutes

**Recommandation** : Créer les index **avant** le déploiement en production.

---

## 🔍 Vérification des Index

### Vérifier qu'un Index Existe

```bash
# Via Firebase CLI
firebase firestore:indexes

# Via Firebase Console
Firebase Console → Firestore → Indexes
```

### Tester une Requête

Si une requête échoue avec l'erreur :
```
The query requires an index. You can create it here: [URL]
```

1. Cliquer sur l'URL fournie
2. Firebase Console s'ouvre avec l'index pré-rempli
3. Cliquer sur "Créer l'index"
4. Attendre la création (quelques minutes)

---

## 📚 Références

- **Documentation Firestore** : https://firebase.google.com/docs/firestore/query-data/indexing
- **Limites Firestore** : https://firebase.google.com/docs/firestore/query-data/queries#query_limitations
- **Coûts Index** : https://firebase.google.com/docs/firestore/pricing#storage

---

**Date de création** : 2026-01-27  
**Version** : V2  
**Auteur** : Senior Dev
