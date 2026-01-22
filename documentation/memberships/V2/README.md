## Module Memberships – V2

Ce dossier décrit la **refactorisation V2** du module `memberships`, en s'appuyant sur l'implémentation existante (V1) et la documentation :

- `V1/ANALYSE_MEMBERSHIPS.md`
- `V1/realisationAfaire.md`
- `V1/AMELIORATION_WORKFLOW_ADMIN.md`

L'objectif est de **conserver le design actuel (UI/UX)** et de :

- Revoir l'**architecture** (domain / services / hooks / composants par fonctionnalité).
- Clarifier et stabiliser la **structure de données** (membre, abonnements, liens vers véhicules, caisses, etc.).
- Isoler les fonctionnalités dans des **sous-modules V2** :
  - `liste-memberships/` (vue principale + tabs) ✅ **TERMINÉ**
  - `details-membership/` ✅ **TERMINÉ** (Phase 5 - Tests d'intégration à faire)
  - `form-membership/` ⏳ **À FAIRE** (Priorité 1)
  - `recherche-memberships/` ⏳ **À FAIRE** (Priorité 2)
  - `exports-memberships/` ⏳ **À FAIRE** (Priorité 3)
  - `anniversaires-memberships/` ⏳ **À FAIRE** (Priorité 4)
  - `stats-memberships/` ⏳ **À FAIRE** (Priorité 5)

Chaque sous-dossier contiendra :

- Un **état des lieux V1** (composants, hooks, services actuels).
- Les **problèmes identifiés** (techniques, UX, données).
- Les **objectifs V2**.
- Un **mapping** vers la future architecture (domain/services/hooks/components/tests).

### État d'avancement

#### ✅ Fonctionnalités terminées

1. **`liste-memberships/`** ✅ **TERMINÉ**
   - Hook `useMembershipsListV2` créé
   - Service `MembershipsListService` créé
   - Repository `MembersRepositoryV2` créé
   - Composants présentatifs extraits (9 composants)
   - Tests d'intégration (8/10 scénarios passent)
   - Documentation complète
   - **Statut** : Production-ready

2. **`details-membership/`** ✅ **TERMINÉ** (Phase 5 restante)
   - Hook `useMembershipDetails` créé
   - 13 composants présentatifs créés
   - Container `MemberDetailsPage` créé et branché
   - Route Next.js mise à jour
   - Tests unitaires du hook (4 scénarios)
   - Documentation complète
   - **Statut** : Production-ready (tests d'intégration à faire en Phase 5)

#### ⏳ Fonctionnalités à faire (par ordre de priorité)

3. **`form-membership/`** ⏳ **PRIORITÉ 1**
   - Création/édition de membres
   - Documentation disponible dans `form-membership/workflow/README.md`
   - **Prochaine étape** : Commencer le refactoring

4. **`recherche-memberships/`** ⏳ **PRIORITÉ 2**
   - Recherche globale (nom, matricule, email, etc.)
   - Documentation disponible dans `recherche-memberships/workflow/README.md`
   - **Prochaine étape** : Après `form-membership`

5. **`exports-memberships/`** ⏳ **PRIORITÉ 3**
   - Exports Excel, CSV, PDF
   - Documentation disponible dans `exports-memberships/workflow/README.md`
   - **Prochaine étape** : Après `recherche-memberships`

6. **`anniversaires-memberships/`** ⏳ **PRIORITÉ 4**
   - Vue anniversaires (liste + calendrier)
   - Documentation disponible dans `anniversaires-memberships/workflow/README.md`
   - **Prochaine étape** : Après `exports-memberships`

7. **`stats-memberships/`** ⏳ **PRIORITÉ 5**
   - Statistiques globales
   - Documentation disponible dans `stats-memberships/workflow/README.md`
   - **Prochaine étape** : Après `anniversaires-memberships`

### Tabs envisagés pour la liste V2

- **Tous les membres** : vue actuelle par défaut.
- **Adhérents** : membres avec adhésion active.
- **Bienfaiteurs** : membres ayant des contributions (module bienfaiteur).
- **Sympathisants** : contacts sans adhésion / abonnement actif.
- **Abonnement valide** : membres avec abonnement en cours.
- **Abonnement invalide / expiré** : membres à relancer.
- **Anniversaires** : entrée rapide vers la vue dédiée (liste + calendrier).

### Architecture V2

```
src/domains/memberships/
├── hooks/
│   ├── useMembershipsListV2.ts ✅
│   ├── useMembershipDetails.ts ✅
│   └── index.ts
├── services/
│   └── MembershipsListService.ts ✅
├── repositories/
│   ├── MembersRepositoryV2.ts ✅
│   └── MembershipRepositoryV2.ts (pour les demandes)
├── components/
│   ├── list/ (9 composants) ✅
│   └── details/ (13 composants) ✅
└── __tests__/
    ├── unit/ ✅
    └── integration/ ✅
```

### Prochaines étapes recommandées

1. **Finaliser `details-membership`** : Créer les tests d'intégration (Phase 5)
2. **Commencer `form-membership`** : Priorité 1 - Création/édition de membres
3. **Poursuivre avec `recherche-memberships`** : Priorité 2 - Recherche globale
