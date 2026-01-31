# Workflow – Demandes Caisse Spéciale V2

Ce dossier contient le **plan d'implémentation** organisé par diagrammes de séquence.

## Document principal

**[WORKFLOW.md](./WORKFLOW.md)** – Liste des tâches par phase, ordre d'implémentation, et tests à réaliser.

## Utilisation

1. **Le workflow est le guide** pour réaliser le projet.
2. **Avant chaque phase** : consulter les **diagrammes de séquence** correspondants (dossier `../sequence/`).
3. **Première étape** : créer la branche Git (Phase initiale).
4. Mettre à jour le workflow au fur et à mesure (cocher les tâches, corriger si nécessaire).

## Référence

Le workflow respecte l'**architecture hybride** du projet KARA : [documentation/general/WORKFLOW.md](../../../../general/WORKFLOW.md)

## Phases

| Phase | Diagramme | Description |
|-------|-----------|-------------|
| **Initiale** | — | Créer la branche Git (`refactor/caisse-speciale-demandes-v2`) |
| 0 | Infrastructure | Règles Firestore, Storage, index |
| 1 | ListerDemandes | Liste, stats, onglets, pagination, exports |
| 2 | FiltrerDemandes | Recherche (3 searchableText), filtres |
| 3 | VoirDetails | Page détails, membre, contact urgence, tableau versements |
| 4 | CreerDemande | Page création, formulaire 3 étapes, contact urgence |
| 5 | Actions | Accepter, Refuser, Réouvrir, Convertir (traçabilité) |
| 6 | ExporterDetailsDemande | Export PDF détails complets |
