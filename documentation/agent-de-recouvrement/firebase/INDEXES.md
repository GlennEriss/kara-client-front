# Index Firestore – Module Agent de recouvrement

> Index nécessaires déduits des diagrammes de séquence (SEQ_ListerAgents, SEQ_RechercherAgents, SEQ_StatsAgents, SEQ_CloudFunctionNotificationsAgent)

## 📋 Vue d'ensemble

| Diagramme | Requête | Index requis |
|-----------|---------|--------------|
| SEQ_ListerAgents | getAgentsWithFilters(actif, searchQuery, sortBy, sortOrder, limit, offset) | actif + searchableText* + createdAt |
| SEQ_RechercherAgents | getAgentsWithFilters(searchQuery + actif + tri + pagination) | actif + searchableText* + createdAt |
| SEQ_StatsAgents | count(actif), count(sexe), count(actif+birthMonth) | actif + birthMonth (pour totalAnniversairesMois) |
| SEQ_CloudFunctionNotificationsAgent | query(actif == true, dateNaissance != null) | actif + dateNaissance |
| SEQ_ListerAgents (tab Anniversaires) | getAgentsAnniversairesMois(actif, birthMonth) | actif + birthMonth + birthDay |
| SEQ_CloudFunctionNotificationsAgent | query(actif == true) + filtre pieceIdentite | — (get complet puis filtre en mémoire) |
| SEQ_VoirDetailsAgent | getDoc(agentId) | — (get par ID) |
| SEQ_SelectionnerAgent* | query(actif == true) | actif |

## 📐 Requêtes détaillées

### 1. Liste avec filtres (ListerAgents, RechercherAgents)

```
Collection: agentsRecouvrement
Filtres: actif (actifs | tous | inactifs)
Recherche: searchableTextLastNameFirst >= query AND searchableTextLastNameFirst < query + '\uf8ff'
         OU searchableTextFirstNameFirst >= query AND ...
         OU searchableTextNumeroFirst >= query AND ...
Tri: nom | prenom | createdAt (asc | desc)
Pagination: limit(12), startAfter(lastDoc)
```

### 2. Cloud Function – Anniversaires

```
Collection: agentsRecouvrement
Filtres: actif == true, dateNaissance != null
```

### 3. Cloud Function – Pièce d'identité

```
Collection: agentsRecouvrement
Filtres: actif == true
(lecture complète puis filtre pieceIdentite.dateExpiration en mémoire)
```

### 4. Tab Anniversaires du mois

```
Collection: agentsRecouvrement
Filtres: actif == true, birthMonth == mois_courant (1-12)
Tri: birthDay ASC (tri en mémoire pour "plus proche" : jour >= aujourd'hui puis 1..jour-1)
Champs dérivés: birthMonth, birthDay (calculés à la sauvegarde depuis dateNaissance)
```

### 5. Sélection agent (Crédit, Caisse, CI)

```
Collection: agentsRecouvrement
Filtres: actif == true
Tri: nom (asc)
```

## 📝 Index à ajouter dans `firestore.indexes.json`

### Index composites – agentsRecouvrement

```json
{
  "collectionGroup": "agentsRecouvrement",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "actif", "order": "ASCENDING" },
    { "fieldPath": "searchableTextLastNameFirst", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" },
    { "fieldPath": "__name__", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "agentsRecouvrement",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "actif", "order": "ASCENDING" },
    { "fieldPath": "searchableTextFirstNameFirst", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" },
    { "fieldPath": "__name__", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "agentsRecouvrement",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "actif", "order": "ASCENDING" },
    { "fieldPath": "searchableTextNumeroFirst", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" },
    { "fieldPath": "__name__", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "agentsRecouvrement",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "actif", "order": "ASCENDING" },
    { "fieldPath": "nom", "order": "ASCENDING" },
    { "fieldPath": "__name__", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "agentsRecouvrement",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "actif", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" },
    { "fieldPath": "__name__", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "agentsRecouvrement",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "actif", "order": "ASCENDING" },
    { "fieldPath": "dateNaissance", "order": "ASCENDING" },
    { "fieldPath": "__name__", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "agentsRecouvrement",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "actif", "order": "ASCENDING" },
    { "fieldPath": "birthMonth", "order": "ASCENDING" },
    { "fieldPath": "birthDay", "order": "ASCENDING" },
    { "fieldPath": "__name__", "order": "ASCENDING" }
  ]
}
```

### Index notifications (module agentsRecouvrement)

L'index existant `notifications` (isRead + createdAt) couvre déjà les requêtes du centre de notifications. Si filtrage par `module`, vérifier qu'un index `module + createdAt` existe.

## 🔗 Références

- **Diagrammes** : `sequence/SEQ_ListerAgents.puml`, `SEQ_RechercherAgents.puml`, `SEQ_CloudFunctionNotificationsAgent.puml`
- **Tab Anniversaires** : Champs `birthMonth` (1-12) et `birthDay` (1-31) à calculer à la création/mise à jour de l'agent
- **Analyse** : `ANALYSE_ALGOLIA_VS_FIRESTORE.md`
- **Fichier projet** : `firestore.indexes.json` (racine)
