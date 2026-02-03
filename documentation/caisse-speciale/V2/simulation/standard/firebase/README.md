# Firebase – Simulation Caisse Spéciale (Standard) V2

Ce dossier documente l’usage de Firebase pour le module **Simulation** (Standard / Standard Charitable).

## Vue d’ensemble

Le module Simulation **ne crée aucune donnée** en base : il s’appuie uniquement sur une **lecture** des paramètres existants.

## Contenu

| Document | Description |
|----------|-------------|
| [FIREBASE.md](./FIREBASE.md) | Usage de Firestore (lecture `caisseSettings`), absence de nouvelles collections/règles/index, référence aux règles existantes |

## Intégration

- **Aucune nouvelle règle** à ajouter pour la simulation : la lecture de la collection `caisseSettings` par les admins est déjà couverte par les règles Contrats / Paramètres Caisse Spéciale.
- **Aucun nouvel index** : la simulation utilise une requête par `caisseType` + `isActive`, déjà supportée par les index existants si besoin.
- **Aucun Storage** : pas d’upload ni de stockage de fichiers pour la simulation.

## Références

- [README.md](../README.md) – Contexte du module Simulation
- [contrats/firebase/FIREBASE.md](../../contrats/firebase/FIREBASE.md) – Règles Caisse Spéciale (dont `caisseSettings` si documenté)
- [V1/settings/README.md](../../../V1/settings/README.md) – Paramètres et collection `caisseSettings`
