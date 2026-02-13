# Firestore Indexes - Dashboard

> Index composites pour un dashboard tabs-first performant.

## 1. Logique tabs/indexes

Chaque tab utilise un sous-ensemble de collections.
Les indexes sont donc listes par famille de tabs.

## 2. Index reutilisables existants

Existants dans `firestore.indexes.json`:

- `users`: `roles (array-contains)` + `createdAt desc`
- `users`: `roles (array-contains)` + `isActive asc` + `createdAt desc`
- `membership-requests`: `status asc` + `createdAt desc`
- `creditDemands`: `status asc` + `createdAt desc`
- `creditDemands`: `creditType asc` + `createdAt desc`
- `caisseSpecialeDemands`: serie d'indexes statut/type/date
- `caisseImprevueDemands`: serie d'indexes statut/type/date
- `agentsRecouvrement`: indexes `actif`, recherche, anniversaires

## 3. Index a ajouter (tabs non couverts)

### 3.1 Tabs Administration

```json
{
  "collectionGroup": "admins",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "roles", "arrayConfig": "CONTAINS" },
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

```json
{
  "collectionGroup": "admins",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

### 3.2 Tab Metiers

```json
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "roles", "arrayConfig": "CONTAINS" },
    { "fieldPath": "profession", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

### 3.3 Tab Geographie

```json
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "roles", "arrayConfig": "CONTAINS" },
    { "fieldPath": "address.province", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

```json
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "roles", "arrayConfig": "CONTAINS" },
    { "fieldPath": "address.city", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

```json
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "roles", "arrayConfig": "CONTAINS" },
    { "fieldPath": "address.arrondissement", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

```json
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "roles", "arrayConfig": "CONTAINS" },
    { "fieldPath": "address.district", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

### 3.4 Tab Recouvrement

```json
{
  "collectionGroup": "payments",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "agentRecouvrementId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

### 3.5 Tab Placements (si tri/filtre combine)

```json
{
  "collectionGroup": "placementDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

## 4. Notes d'implementation

- ajouter blocs dans `firestore.indexes.json`
- deployer: `firebase deploy --only firestore:indexes`
- verifier qu'aucun tab ne remonte `missing index`

## 5. Priorite

1. `admins` (tab Administration)
2. `users` geographie/metiers
3. `payments` recouvrement
4. `placementDemands` si requetes composites actives

