# Diagrammes d'activité – Check Charity Contrib

Ce dossier contient les diagrammes d'activité pour la fonctionnalité **vérification éligibilité œuvres de charité** (types de caisse charitable en step 2 des formulaires Nouvelle demande et Nouveau contrat).

## Fichiers

| Fichier | Description |
|---------|-------------|
| [CheckCharityEligibility.puml](./CheckCharityEligibility.puml) | Consultation de l'éligibilité en step 2 (lecture du cache member-charity-summary). Le cache est maintenu par la Cloud Function (voir [function/README.md](../function/README.md)). |

## Références

- [README.md](../README.md) – Analyse, participant vs contributeur, approche cache + Cloud Function
- [WORKFLOW.md](../WORKFLOW.md) – Plan d'implémentation
- [../function/README.md](../function/README.md) – Cloud Function (mise à jour du cache)
