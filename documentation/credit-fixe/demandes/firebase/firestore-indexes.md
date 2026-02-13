# Index Firestore – creditDemands

> Index composites necessaires pour les requetes sur la collection `creditDemands`.

## Index existants

Tous les index ci-dessous sont declares dans `firestore.indexes.json` et sont **deja deployes**.

### 1. Filtre par statut + tri par date

```json
{
  "collectionGroup": "creditDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Usage** : Liste des demandes filtrees par statut (onglets PENDING / APPROVED / REJECTED), triees par date de creation decroissante.

---

### 2. Filtre par type de credit + tri par date

```json
{
  "collectionGroup": "creditDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "creditType", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Usage** : Liste des demandes filtrees par type (`FIXE`), triees par date.

---

### 3. Filtre par client + tri par date

```json
{
  "collectionGroup": "creditDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "clientId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Usage** : Historique des demandes d'un membre specifique.

---

### 4. Filtre par garant + tri par date

```json
{
  "collectionGroup": "creditDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "guarantorId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Usage** : Liste des demandes pour lesquelles un membre est garant.

---

### 5. Filtre par statut + type de credit + tri par date

```json
{
  "collectionGroup": "creditDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "creditType", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Usage** : Combinaison la plus courante : demandes FIXE en attente, triees par date.

---

### 6. Filtre par statut + client + tri par date

```json
{
  "collectionGroup": "creditDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "clientId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Usage** : Demandes d'un membre specifique dans un statut donne.

---

### 7. Filtre par statut + garant + tri par date

```json
{
  "collectionGroup": "creditDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "guarantorId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Usage** : Demandes ou un membre est garant, filtrees par statut.

---

## Resume

| # | Champs | Cas d'usage principal |
|---|---|---|
| 1 | `status` + `createdAt` | Onglets statut |
| 2 | `creditType` + `createdAt` | Filtre par type FIXE |
| 3 | `clientId` + `createdAt` | Historique d'un membre |
| 4 | `guarantorId` + `createdAt` | Demandes d'un garant |
| 5 | `status` + `creditType` + `createdAt` | Filtre combine statut + type |
| 6 | `status` + `clientId` + `createdAt` | Filtre combine statut + client |
| 7 | `status` + `guarantorId` + `createdAt` | Filtre combine statut + garant |

> **Note** : Ces index sont partages avec les demandes SPECIALE et AIDE. Aucun index supplementaire n'est necessaire pour le type FIXE.
