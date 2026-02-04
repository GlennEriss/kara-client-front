# Diagrammes de séquence – Check Charity Contrib

Ce dossier contient les diagrammes de séquence pour la fonctionnalité **vérification éligibilité œuvres de charité** en step 2 des formulaires Nouvelle demande et Nouveau contrat.

## Architecture domains

Les diagrammes respectent l’architecture **domains** :

- **domains/financial/caisse-speciale** : composant Step 2 (Step2InfosDemande ou Step2ContractConfiguration), hook `useMemberCharityEligibility`, service `CharityEligibilityService`.
- Le service caisse-speciale lit le document **member-charity-summary/{memberId}** (mis à jour par la Cloud Function ; voir [../function/README.md](../function/README.md)).

## Fichiers

| Fichier | Description |
|---------|-------------|
| [SEQ_CheckCharityEligibility.puml](./SEQ_CheckCharityEligibility.puml) | Séquence : consultation éligibilité en step 2 (lecture du cache member-charity-summary). La mise à jour du cache par la Cloud Function est décrite dans [function/README.md](../function/README.md). |

## Références

- [../activite/CheckCharityEligibility.puml](../activite/CheckCharityEligibility.puml) – Diagramme d'activité
- [../function/README.md](../function/README.md) – Cloud Function (mise à jour du cache)
