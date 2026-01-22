## Tests – Statistiques membres (V2)

### 1. Tests unitaires

#### 1.1 `MembershipStatsService`

- [ ] Calcul correct de chaque indicateur :
  - Total, actifs, expirés, hommes, femmes.
  - Avec/sans véhicule, nouveaux ce mois/année, par type de membership.
- [ ] Calcul correct des pourcentages.
- [ ] Gestion des cas limites (liste vide, membres sans données complètes).

#### 1.2 `useMembershipStats`

- [ ] Retourne les stats calculées correctement.
- [ ] Gère `isLoading`, `isError`.

### 2. Tests d'intégration

Fichier cible : `src/domains/memberships/__tests__/integration/membership-stats.integration.test.tsx`

- [ ] **INT-STATS-01 – Affichage des stats dans la liste**
  - Vérifier que le carrousel de stats s'affiche avec les bonnes valeurs.
  - Vérifier les graphiques (si présents).
- [ ] **INT-STATS-02 – Calcul des pourcentages**
  - Vérifier que les pourcentages affichés correspondent aux calculs attendus.

### 3. Tests E2E (Playwright – à planifier)

- [ ] Vérification visuelle des stats dans la liste des membres.

### 4. Attributs `data-testid` recommandés

- `data-testid="membership-stats-carousel"` : conteneur du carrousel.
- `data-testid="membership-stat-{key}"` : chaque carte de stat (ex. `membership-stat-total`, `membership-stat-active`).

### 5. Couverture cible

- **Service** : ≥80% (tous les calculs d'indicateurs).
- **Hook** : ≥80%.
- **Intégration** : scénarios INT-STATS-01 et 02 couverts.
