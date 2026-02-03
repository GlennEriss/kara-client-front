# Workflow – Simulation Caisse Spéciale (Standard) V2

Ce dossier contient le **plan d’implémentation** du module Simulation (Standard / Standard Charitable).

## Document principal

**[WORKFLOW.md](./WORKFLOW.md)** – Tâches par phase, ordre d’implémentation et critères de validation.

## Utilisation

1. Le workflow sert de **guide** pour réaliser le module.
2. **Avant chaque phase** : consulter les **diagrammes de séquence** correspondants (dossier `../sequence/`) et le README parent.
3. Mettre à jour le workflow au fur et à mesure (cocher les tâches, ajuster si nécessaire).

## Référence

L’organisation respecte l’**architecture hybride** du projet KARA :  
[documentation/general/WORKFLOW.md](../../../../../general/WORKFLOW.md)

## Phases

| Phase | Description |
|-------|-------------|
| **Initiale** | Créer la branche Git |
| 0 | Route et menu – Ajout du sous-menu Simulation, page `/caisse-speciale/simulation` |
| 1 | Formulaire – Champs type caisse, montant, durée (max 12), date souhaitée, validation |
| 2 | Récupération paramètres – Lecture des CaisseSettings actifs pour le type choisi |
| 3 | Calcul et tableau – Échéancier + colonne bonus gagné, affichage tableau récapitulatif |
| 4 | Optionnel – Export PDF / Excel du tableau |

## Références

- [README.md](../README.md) – Contexte, formulaire, tableau récapitulatif
- [activite/](../activite/README.md) – Diagrammes d'activité (LancerSimulation, ExporterSimulation)
- [sequence/](../sequence/README.md) – Diagrammes de séquence (SEQ_LancerSimulation, SEQ_ExporterSimulation)
- [firebase/](../firebase/README.md) – Usage Firebase (lecture caisseSettings)
- [ui/](../ui/README.md) – Wireframes et spécifications UI
- [tests/](../tests/README.md) – Plans de tests (unitaires, intégration, E2E)
- [Demandes – WORKFLOW.md](../../demandes/workflow/WORKFLOW.md) – Style de workflow
- [Paramètres Caisse Spéciale](../../../V1/settings/README.md) – Types et bonusTable
