# Diagrammes de sequence - Simulation Credit Fixe

Ce dossier contient les diagrammes de sequence pour la simulation Credit Fixe en respectant l'architecture domains.

## Fichiers

| Fichier | Description | Reference activite |
|---|---|---|
| `SEQ_LancerSimulationCreditFixe.puml` | Flux complet : saisie admin, validation, calcul standard/personnalisee, affichage resultat, puis PDF/Excel/Impression/WhatsApp. | `simulation/activite/SimulationCreditFixe.puml` |

## Architecture appliquee

- Page (app)
- Domain Component
- Domain Hook
- Domain Service (calcul)
- Domain Service (exports)

Ce diagramme est aligne avec :

- `documentation/credit-fixe/simulation/architecture/README.md`
