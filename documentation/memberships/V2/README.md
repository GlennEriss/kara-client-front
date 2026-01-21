## Module Memberships – V2

Ce dossier décrit la **refactorisation V2** du module `memberships`, en s’appuyant sur l’implémentation existante (V1) et la documentation :

- `V1/ANALYSE_MEMBERSHIPS.md`
- `V1/realisationAfaire.md`
- `V1/AMELIORATION_WORKFLOW_ADMIN.md`

L’objectif est de **conserver le design actuel (UI/UX)** et de :

- Revoir l’**architecture** (domain / services / hooks / composants par fonctionnalité).
- Clarifier et stabiliser la **structure de données** (membre, abonnements, liens vers véhicules, caisses, etc.).
- Isoler les fonctionnalités dans des **sous-modules V2** :
  - `liste-memberships/` (vue principale + tabs)
  - `details-membership/`
  - `form-membership/`
  - `recherche-memberships/`
  - `exports-memberships/`
  - `anniversaires-memberships/`
  - `stats-memberships/`

Chaque sous-dossier contiendra :

- Un **état des lieux V1** (composants, hooks, services actuels).
- Les **problèmes identifiés** (techniques, UX, données).
- Les **objectifs V2**.
- Un **mapping** vers la future architecture (domain/services/hooks/components/tests).

### Tabs envisagés pour la liste V2

- **Tous les membres** : vue actuelle par défaut.
- **Adhérents** : membres avec adhésion active.
- **Bienfaiteurs** : membres ayant des contributions (module bienfaiteur).
- **Sympathisants** : contacts sans adhésion / abonnement actif.
- **Abonnement valide** : membres avec abonnement en cours.
- **Abonnement invalide / expiré** : membres à relancer.
- **Anniversaires** : entrée rapide vers la vue dédiée (liste + calendrier).

