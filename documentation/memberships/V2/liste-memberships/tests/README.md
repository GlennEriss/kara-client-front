## Tests – Liste des membres (V2)

### Tests unitaires

#### Repository (`MembershipRepositoryV2`)
- [ ] `getMembersPaginated` : retourne pagination correcte avec filtres.
- [ ] `getMembersPaginated` : gère les filtres Firestore (rôles, type, hasCar, isActive).
- [ ] `getMembersPaginated` : gère les filtres texte/adresse/profession (selon stratégie V2).
- [ ] `getMembersPaginated` : évite N+1 queries (agrégation subscriptions en batch).

#### Service (`MembershipStatsService`)
- [ ] Calcul stats : actifs, expirés, genre (hommes/femmes).
- [ ] Calcul pourcentages : cohérence des calculs.
- [ ] Gestion cas limites : liste vide, données partielles.

#### Hook (`useMembershipsListV2`)
- [ ] Hook agrège correctement : repository + stats service.
- [ ] Gestion états : `isLoading`, `isError`, `error`.
- [ ] Support tabs : mapping tab → `UserFilters` correct.
- [ ] Pagination : changement de page, items par page.
- [ ] Cache React Query : invalidation correcte.

#### Composants présentatifs
- [ ] `MembershipsListStats` : affiche carrousel avec données mockées.
- [ ] `MembershipsListHeader` : affiche titre, compteur, boutons.
- [ ] `MembershipsListTabs` : changement de tab déclenche bon preset de filtres.
- [ ] `MembershipsListFilters` : propagation correcte des filtres.
- [ ] `MembershipsListLayout` : toggle grille/liste fonctionne.
- [ ] `MembershipsListPagination` : pagination fonctionne.

### Tests d'intégration

#### Scénarios principaux
- [ ] **INT-LIST-01** : Chargement réussi (stats, liste, pagination visibles).
- [ ] **INT-LIST-02** : Erreur réseau (message + bouton retry).
- [ ] **INT-LIST-03** : Changement de tab (Adhérents → Bienfaiteurs → Sympathisants).
- [ ] **INT-LIST-04** : Filtres avancés (géographie : province → ville → arrondissement → quartier).
- [ ] **INT-LIST-05** : Recherche texte (nom, matricule, email).
- [ ] **INT-LIST-06** : Pagination (changement page, items par page).
- [ ] **INT-LIST-07** : Toggle vue grille/liste.
- [ ] **INT-LIST-08** : Export (ouverture modal `ExportMembershipModal`).
- [ ] **INT-LIST-09** : Ouverture détails membre (modal `MemberDetailsWrapper`).
- [ ] **INT-LIST-10** : État vide (avec/sans filtres actifs).

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

### Attributs `data-testid` à ajouter

- `data-testid="memberships-list-page"` : conteneur principal.
- `data-testid="memberships-list-stats"` : carrousel stats.
- `data-testid="memberships-list-header"` : header avec actions.
- `data-testid="memberships-list-tabs"` : conteneur tabs.
- `data-testid="memberships-list-tab-{tabName}"` : chaque tab (ex. `tab-adherents`).
- `data-testid="memberships-list-filters"` : composant filtres.
- `data-testid="memberships-list-layout"` : layout grille/liste.
- `data-testid="memberships-list-pagination"` : pagination.
- `data-testid="memberships-list-empty"` : état vide.

### Couverture cible

- **Repository** : ≥80% (méthodes principales).
- **Service stats** : ≥80% (calculs et cas limites).
- **Hook** : ≥80% (agrégation, états, tabs).
- **Composants** : ≥80% (ou testés indirectement via intégration).
- **Intégration** : tous les scénarios critiques (INT-LIST-01 à INT-LIST-10).
- **E2E** : scénarios principaux utilisateur (navigation, recherche, filtres, exports).

