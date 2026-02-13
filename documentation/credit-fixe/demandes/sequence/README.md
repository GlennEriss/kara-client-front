# Diagrammes de sequence – Demandes Credit Fixe

Ce dossier contient les diagrammes de sequence pour les demandes Credit Fixe en respectant l'architecture domains.

## Fichiers

| Fichier | Description | Reference activite |
|---|---|---|
| `SEQ_CreerDemandeCreditFixe.puml` | Flux complet : recherche membre, saisie formulaire, validation, creation en base, notification. | `demandes/activite/DemandesCreditFixe.puml` |
| `SEQ_TraiterDemandeCreditFixe.puml` | Flux de traitement : consultation detail, approbation / rejet / modification / suppression, puis creation du contrat. | `demandes/activite/DemandesCreditFixe.puml` |

## Architecture appliquee

- Page (app)
- Domain Component
- Domain Hook
- Domain Service
- Domain Repository
- Firestore

Ce diagramme est aligne avec :

- `documentation/credit-fixe/demandes/architecture/README.md`
