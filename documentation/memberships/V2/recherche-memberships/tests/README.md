## Tests – Recherche & filtres (V2)

### 1. Tests unitaires

#### 1.1 `useMembershipFilters`

- [ ] Initialisation correcte des filtres par défaut.
- [ ] Mise à jour de chaque filtre (`setFilter`).
- [ ] Réinitialisation (`resetFilters`).
- [ ] Calcul `activeFiltersCount`.

#### 1.2 `useMembershipSearch`

- [ ] Cas succès : renvoie une liste de membres correspondant au `searchTerm`.
- [ ] Cas "aucun résultat".
- [ ] Cas erreur (backend / réseau).
- [ ] Gestion du `enabled` et du seuil minimal de caractères.

### 2. Tests d’intégration

Fichier cible : `src/domains/memberships/__tests__/integration/membership-search.integration.test.tsx`

- [ ] **INT-SEARCH-01 – Recherche simple par nom/matricule**
  - Saisir un nom/matricule dans la barre de recherche.
  - Vérifier que la liste est filtrée correctement.

- [ ] **INT-SEARCH-02 – Filtres combinés**
  - Appliquer plusieurs filtres (type membre, abonnement, hasCar, géographie).
  - Vérifier que la liste ne montre que les membres correspondants.

- [ ] **INT-SEARCH-03 – Changement de tab**
  - Cliquer sur les tabs (Adhérents, Bienfaiteurs, Sympathisants, etc.).
  - Vérifier que les filtres correspondants sont appliqués (presets de `UserFilters`).

- [ ] **INT-SEARCH-04 – UC5 Véhicules**
  - Depuis l’onglet Véhicules, rechercher un membre par nom/matricule.
  - Vérifier que le hook/service de recherche partagé est bien appelé et que le membre peut être sélectionné.

### 3. Tests E2E (Playwright – à planifier)

- [ ] Recherche globale par nom/matricule sur `/memberships`.
- [ ] Application de filtres combinés et vérification visuelle de la liste.
- [ ] Changement de tab et vérification du contenu.
- [ ] Parcours UC5 complet (onglet Véhicules → recherche → sélection membre).

### 4. Attributs `data-testid` recommandés

- `data-testid="membership-search-bar"` : barre de recherche globale.
- `data-testid="membership-filters-panel"` : conteneur des filtres avancés.
- `data-testid="membership-tab-{name}"` : chaque tab (ex. `membership-tab-adherents`).

### 5. Couverture cible

- **Hooks** : ≥80% (`useMembershipFilters`, `useMembershipSearch`).
- **Intégration** : scénarios INT-SEARCH-01 à 04 couverts.
- **E2E** : au moins 2–3 parcours utilisateur complets.
