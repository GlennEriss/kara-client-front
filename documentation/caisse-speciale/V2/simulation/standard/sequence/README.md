# Diagrammes de séquence – Simulation Caisse Spéciale (Standard) V2

Ce dossier contient les diagrammes de séquence pour le module Simulation Standard / Standard Charitable. Ils respectent l’**architecture domains** : Page (app) → Domain Component → Domain Hook → Domain Service → Domain Repository → Firestore.

## Architecture domains

Package cible : **`src/domains/financial/caisse-speciale/`**

- **components/** : SimulationForm (formulaire + tableau récapitulatif)
- **hooks/** : useSimulationRun (lance la simulation, appelle le service)
- **services/** : CaisseSpecialeSimulationService (calcul échéancier + bonus), SimulationExportService (PDF/Excel)
- **repositories/** : CaisseSettingsRepository (lecture paramètres actifs, ex. getActiveSettings)

## Fichiers

| Fichier | Description | Référence activité |
|---------|-------------|-------------------|
| [SEQ_LancerSimulation.puml](./SEQ_LancerSimulation.puml) | Page → SimulationForm (Domain Component) → useSimulationRun (Domain Hook) → CaisseSpecialeSimulationService → CaisseSettingsRepository → Firestore. Calcul échéancier + bonus, affichage tableau. | LancerSimulation.puml |
| [SEQ_ExporterSimulation.puml](./SEQ_ExporterSimulation.puml) | SimulationForm/TableView (Domain Component) → SimulationExportService (Domain Service) : export PDF ou Excel du tableau (optionnel). | ExporterSimulation.puml |

## Alignement activité ↔ séquence

- **LancerSimulation** : formulaire, validation, récupération des CaisseSettings actifs via le repository (Firestore lecture seule), calcul dans le service, affichage du tableau.
- **ExporterSimulation** : Domain Component appelle le Domain Service d’export ; génération PDF/Excel côté client, pas de persistance.

## Références techniques

- Architecture : [documentation/architecture/PLAN_MIGRATION_DOMAINS.md](../../../../../architecture/PLAN_MIGRATION_DOMAINS.md) (si existant), [contrats/sequence](../../contrats/sequence/README.md)
- `computeBonus` : `src/services/caisse/engine.ts`
- [README.md](../README.md) – Contexte, tableau récapitulatif
- [Diagrammes d'activité](../activite/README.md)
