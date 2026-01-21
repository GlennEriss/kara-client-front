## Workflow d’implémentation – Liste des membres (V2)

### Objectif
Refondre la structure (hooks, services, repository, composants) tout en conservant l’UI/UX existante de `MembershipList`.

### Séquence d'implémentation (ordre recommandé)

#### Phase 1 : Fondations (repository et services) ⏳ **À FAIRE**
1. **Créer/améliorer repository V2** (`src/domains/memberships/repositories/MembershipRepositoryV2.ts`)
   - [ ] Méthode `getMembersPaginated(filters, page, limit)` optimisée :
     - Éviter N+1 queries (agréger subscriptions en batch si possible).
     - Déplacer filtres texte/adresse/profession côté Firestore (index nécessaires).
   - [ ] Méthode `getMemberStats()` ou équivalent pour stats globales.
   - [ ] Tests unitaires repository (≥80% couverture).

2. **Créer service de stats** (`src/domains/memberships/services/MembershipStatsService.ts`)
   - [ ] Calcul des statistiques (actifs, expirés, genre, etc.) à partir de données brutes.
   - [ ] Tests unitaires service.

#### Phase 2 : Hook agrégateur de données ⏳ **À FAIRE**
3. **Créer hook `useMembershipsListV2`** (`src/domains/memberships/hooks/`)
   - [ ] Hook agrège : repository V2 + gestion filtres + pagination.
   - [ ] Support des **tabs** (presets de filtres) :
     - Paramètre `tab?: 'all' | 'adherents' | 'bienfaiteurs' | 'sympathisants' | 'abonnement-valide' | 'abonnement-invalide' | 'anniversaires'`.
     - Mapping tab → `UserFilters` dans le hook.
   - [ ] Gestion états : `isLoading`, `isError`, `error`.
   - [ ] Retourne : `{ members, pagination, stats, isLoading, isError, error }`.
   - [ ] Cache React Query pour éviter appels multiples.
   - [ ] Tests unitaires hook (≥80% couverture).

#### Phase 3 : Sous-composants présentatifs ⏳ **À FAIRE**
4. **Composants de base** (`src/domains/memberships/components/list/`)
   - [ ] `MembershipsListSkeleton.tsx` (squelette de chargement).
   - [ ] `MembershipsListErrorState.tsx` (état erreur + retry).

5. **Composants sections (ordre logique d'affichage)**
   - [ ] `MembershipsListStats.tsx` (carrousel de stats, reprend `StatsCarousel` interne).
   - [ ] `MembershipsListHeader.tsx` (titre, compteur, boutons actions : actualiser, exporter, nouveau).
   - [ ] `MembershipsListTabs.tsx` (tabs : Tous, Adhérents, Bienfaiteurs, Sympathisants, Abonnement valide/invalide, Anniversaires).
   - [ ] `MembershipsListFilters.tsx` (wrapper autour de `MemberFilters` simplifié).
   - [ ] `MembershipsListLayout.tsx` (grille/liste avec `MemberCard`, toggle viewMode).
   - [ ] `MembershipsListPagination.tsx` (wrapper autour de `MembershipPagination`).
   - [ ] `MembershipsListEmptyState.tsx` (état vide avec boutons d'action).

#### Phase 4 : Refacto composant principal ⏳ **À FAIRE**
6. **Refactoriser `MembershipList.tsx` → `MembershipsListPage.tsx`**
   - [ ] Remplacer monolithe par composition des sous-composants.
   - [ ] Utiliser `useMembershipsListV2` pour données.
   - [ ] Conserver design existant (mêmes classes/styles CSS).
   - [ ] Gérer états : loading (skeleton), error (error state), success (liste).
   - [ ] Gérer modals (détails, prévisualisation PDF, export).
   - [ ] Réduction de ~900 lignes à ~200-300 lignes (container + modals).

#### Phase 5 : Tests d'intégration ⏳ **À FAIRE**
7. **Tests d'intégration** (`src/domains/memberships/__tests__/integration/memberships-list.integration.test.tsx`)
   - [ ] Scénario chargement réussi (stats, liste, pagination) - `INT-LIST-01`.
   - [ ] Scénario erreur réseau (retry) - `INT-LIST-02`.
   - [ ] Scénario changement de tab (Adhérents, Bienfaiteurs, etc.) - `INT-LIST-03`.
   - [ ] Scénario filtres avancés (géographie, entreprise, profession) - `INT-LIST-04`.
   - [ ] Scénario recherche texte (nom, matricule, email) - `INT-LIST-05`.
   - [ ] Scénario pagination (changement page, items par page) - `INT-LIST-06`.
   - [ ] Scénario vue grille/liste (toggle) - `INT-LIST-07`.
   - [ ] Scénario export (ouverture modal) - `INT-LIST-08`.
   - [ ] Scénario ouverture détails membre (modal) - `INT-LIST-09`.
   - [ ] Scénario état vide (avec/sans filtres) - `INT-LIST-10`.

#### Phase 6 : Documentation & vérifications ⏳ **À FAIRE**
8. **Mise à jour documentation**
   - [ ] Vérifier règles Firebase (Firestore/Storage) dans `firebase/README.md`.
   - [ ] Mettre à jour diagrammes activité/séquence si flux modifiés.
   - [ ] Compléter checklist tests (`tests/README.md`) avec résultats.
   - [ ] Vérifier couverture globale (objectif ≥80%).

### Ordre de priorité (si itération)
- **Critique** : Phase 1 (repository) + Phase 2 (hook) → base pour tout le reste.
- **Important** : Phase 3 (sous-composants) → peut être fait en parallèle par section.
- **Finalisation** : Phase 4 (refacto principal) + Phase 5 (tests intégration) + Phase 6 (docs).

### Suivi & validation
- **Checklist** : cocher chaque item au fur et à mesure de l'implémentation.
- **Tests** : exécuter tests unitaires après chaque phase (Phase 1, 2, 3) et tests d'intégration après Phase 5.
- **Documentation** : mettre à jour `tests/README.md` avec résultats, `firebase/README.md` si règles modifiées.
- **Diagrammes** : ajuster `activite/` et `sequence/` si flux significativement modifiés.
- **Code review** : valider chaque phase avant de passer à la suivante (surtout Phase 1-2 critiques).

