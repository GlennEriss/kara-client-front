## Tests – Liste des membres (V2)

### Tests unitaires

#### Repository (`MembersRepositoryV2`)
- [x] `getAll` : retourne pagination correcte avec filtres (via `getMembers` dans `member.db.ts`).
- [x] `getAll` : gère les filtres Firestore (rôles, type, hasCar, isActive).
- [x] `getAll` : évite N+1 queries (agrégation subscriptions en batch avec `Promise.all()`).
- [x] **Pagination côté serveur** :
  - [x] `getMembers` : utilise `getCountFromServer()` pour obtenir le vrai `totalItems`.
  - [x] `getMembers` : calcule `totalPages` basé sur le vrai total (`Math.ceil(totalItems / limit)`).
  - [x] `getMembers` : implémente correctement la pagination par curseur (`startAfter(cursor)`).
  - [x] `getMembers` : retourne `nextCursor` et `prevCursor` corrects pour navigation.
  - [x] `getMembers` : applique tous les filtres côté Firestore avant pagination.
- [ ] Tests unitaires repository : **À FAIRE** (≥80% couverture).

#### Service (`MembershipsListService`)
- [x] Calcul stats : actifs, expirés, genre (hommes/femmes) via `calculateStats()`.
- [x] Calcul pourcentages : cohérence des calculs.
- [x] Gestion cas limites : liste vide, données partielles.
- [x] Mapping tabs → filtres : `buildFiltersForTab()` implémenté.
- [ ] Tests unitaires service : **À FAIRE** (≥80% couverture).

#### Hook (`useMembershipsListV2`)
- [x] Hook agrège correctement : repository + stats service.
- [x] Gestion états : `isLoading`, `isError`, `error`.
- [x] Support tabs : mapping tab → `UserFilters` correct (via `MembershipsListService.buildFiltersForTab`).
- [x] Pagination : changement de page, items par page, navigation par curseur.
- [x] Cache React Query : invalidation correcte (clé de cache inclut filtres, page, curseur).
- [x] Navigation par curseur : `goToNextPage()`, `goToPrevPage()`, `canGoNext`, `canGoPrev`.
- [ ] Tests unitaires hook : **À FAIRE** (≥80% couverture).

#### Composants présentatifs
- [x] `MembershipsListStats` : affiche carrousel avec données (testé via intégration).
- [x] `MembershipsListHeader` : affiche titre, compteur, boutons (testé via intégration).
- [x] `MembershipsListTabs` : changement de tab déclenche bon preset de filtres (testé via intégration).
- [x] `MembershipsListFilters` : propagation correcte des filtres (testé via intégration).
- [x] `MembershipsListLayout` : toggle grille/liste fonctionne (testé via intégration).
- [x] `MembershipsListPagination` : pagination fonctionne (testé via intégration).
- [x] `MembershipsListSkeleton` : état de chargement (testé via intégration).
- [x] `MembershipsListErrorState` : état d'erreur (testé via intégration).
- [x] `MembershipsListEmptyState` : état vide (testé via intégration).

### Tests d'intégration

#### Scénarios principaux
- [x] **INT-LIST-01** : Chargement réussi (stats, liste, pagination visibles). ✅ **PASSE**
- [x] **INT-LIST-02** : Erreur réseau (message + bouton retry). ✅ **PASSE**
- [x] **INT-LIST-03** : Changement de tab (Adhérents → Bienfaiteurs → Sympathisants). ✅ **PASSE**
- [ ] **INT-LIST-04** : Filtres avancés (géographie : province → ville → arrondissement → quartier). ⚠️ **RECOMMANDÉ EN E2E**
- [ ] **INT-LIST-05** : Recherche texte (nom, matricule, email). ⚠️ **RECOMMANDÉ EN E2E**
- [x] **INT-LIST-06** : Pagination (changement page, items par page). ✅ **PASSE**
  - [x] Vérifier que `totalItems` affiché correspond au vrai total (pas seulement la page actuelle).
  - [x] Vérifier que `totalPages` est calculé correctement (`Math.ceil(totalItems / itemsPerPage)`).
  - [x] Vérifier que la navigation page suivante/précédente fonctionne avec le curseur.
  - [x] Vérifier que changer `itemsPerPage` recalcule correctement `totalPages`.
  - [x] Vérifier que les filtres sont appliqués avant pagination (tous les membres correspondant aux filtres sont comptabilisés dans `totalItems`).
- [x] **INT-LIST-07** : Toggle vue grille/liste. ✅ **PASSE**
- [x] **INT-LIST-08** : Export (ouverture modal `ExportMembershipModal`). ✅ **PASSE**
- [x] **INT-LIST-09** : Ouverture détails membre (modal `MemberDetailsWrapper`). ✅ **PASSE**
- [x] **INT-LIST-10** : État vide (avec/sans filtres actifs). ✅ **PASSE**

**Résultat : 8/10 tests d'intégration passent** (2 tests recommandés en E2E pour filtres avancés et recherche texte).

### Tests E2E (Playwright)

#### Scénarios utilisateur
- [ ] Navigation vers `/memberships` depuis menu admin.
- [ ] Affichage de la liste avec stats et pagination.
- [ ] Recherche par nom/matricule.
- [ ] Application de filtres (type membre, abonnement, véhicule).
- [ ] Changement de tab (Adhérents, Bienfaiteurs, etc.).
- [ ] Toggle vue grille/liste.
- [ ] Navigation pagination (page suivante, précédente).
- [ ] Clic sur une carte membre → ouverture modal détails.
- [ ] Export (ouverture modal, choix format/filtre).
- [ ] Bouton "Nouveau Membre" → navigation vers `/memberships/add`.

### Attributs `data-testid` ajoutés ✅

- [x] `data-testid="memberships-list-page"` : conteneur principal (`MembershipsListPage.tsx`).
- [x] `data-testid="memberships-list-tabs"` : conteneur tabs (`MembershipsListTabs.tsx`).
- [x] `data-testid="memberships-list-tab-{tabValue}"` : chaque tab (`MembershipsListTabs.tsx`).
- [x] `data-testid="memberships-list-layout"` : layout grille/liste (`MembershipsListLayout.tsx`).
- [x] `data-testid="member-card-{memberId}"` : chaque carte membre (`MembershipsListLayout.tsx`).
- [x] `data-testid="memberships-list-pagination"` : pagination (`MembershipsListPagination.tsx`).
- [x] `data-testid="view-mode-grid"` : bouton vue grille (`MembershipsListHeader.tsx`).
- [x] `data-testid="view-mode-list"` : bouton vue liste (`MembershipsListHeader.tsx`).
- [x] `data-testid="export-button"` : bouton export desktop (`MembershipsListHeader.tsx`).
- [x] `data-testid="export-button-mobile"` : bouton export mobile (`MembershipsListHeader.tsx`).
- [x] `data-testid="view-details-dropdown-{memberId}"` : bouton détails dropdown (`MemberCard.tsx`).
- [x] `data-testid="view-details-mobile-{memberId}"` : bouton détails mobile (`MemberCard.tsx`).

### Couverture cible

- **Repository** : ≥80% (méthodes principales).
- **Service stats** : ≥80% (calculs et cas limites).
- **Hook** : ≥80% (agrégation, états, tabs).
- **Composants** : ≥80% (ou testés indirectement via intégration).
- **Intégration** : tous les scénarios critiques (INT-LIST-01 à INT-LIST-10).
- **E2E** : scénarios principaux utilisateur (navigation, recherche, filtres, exports).

