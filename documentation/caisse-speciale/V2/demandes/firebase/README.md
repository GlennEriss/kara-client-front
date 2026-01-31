# Firebase – Demandes Caisse Spéciale V2

Ce dossier contient la documentation des règles et index Firebase pour le module Demandes Caisse Spéciale.

## Document principal

**[FIREBASE.md](./FIREBASE.md)** – Règles Firestore, règles Storage et index Firestore nécessaires pour tous les workflows documentés dans les diagrammes d'activité et de séquence.

## Contenu

| Section | Description |
|---------|-------------|
| **1. Règles Firestore** | Collection `caisseSpecialeDemands` – lecture/écriture admin, validation des champs, traçabilité |
| **2. Règles Storage** | Chemins pour photos contact d'urgence (`emergency-contacts`) |
| **3. Index Firestore** | Index pour filtrage (status, caisseType, dates), recherche (3 searchableText), pagination |

## Intégration

Les extraits de règles et d'index doivent être intégrés dans les fichiers projet :

- `firestore.rules` – Règles Firestore
- `storage.rules` – Règles Storage (optionnel si réutilisation de `emergency-contacts`)
- `firestore.indexes.json` – Index Firestore

## Déploiement

```bash
firebase deploy --only firestore
firebase deploy --only storage
```
