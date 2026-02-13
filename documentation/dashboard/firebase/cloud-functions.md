# Cloud Functions - Dashboard

> Reponse: **oui, recommande**, avec logique tab-aware.

## 1. Pourquoi

Le dashboard est compose de tabs modules. Calculer tous les tabs cote client est couteux.
Cloud Functions permettent de calculer uniquement le tab actif, puis de le cacher.

## 2. Architecture proposee

```text
functions/src/dashboard/
├── buildDashboardSnapshot.ts
├── refreshDashboardSnapshot.ts
├── getDashboardSnapshot.ts
└── dashboard.types.ts
```

## 3. Fonctions cibles

### 3.1 `getDashboardSnapshot` (callable)

Input:

- `activeTab`
- `period`
- `filters`
- `forceRefresh`

Traitement:

1. chercher snapshot tab dans `dashboardAggregates`
2. si frais -> retour cache
3. sinon -> reconstruire snapshot tab
4. persister et retourner

### 3.2 `refreshDashboardSnapshot` (scheduled)

- toutes les 15 min
- precompute tabs prioritaires:
  - `executive`
  - `administration`
  - `recouvrement`
  - `credit_fixe` (ou autres tabs critiques metier)

### 3.3 `buildDashboardSnapshot` (interne)

- agrège uniquement les sources du tab demande
- applique regles metier du tab

## 4. Collection de cache

`dashboardAggregates/{snapshotId}`

- `snapshotId = ${periodKey}__${filtersHash}__${activeTab}`
- `generatedAt`, `ttlAt`, `activeTab`, `snapshot`

## 5. Lock anti-concurrence

`dashboardJobLocks/global`

- lock TTL 2 min
- evite recalculs paralleles du meme tab

## 6. Integrations `functions/src/index.ts`

```ts
export { refreshDashboardSnapshot } from './dashboard/refreshDashboardSnapshot'
export { getDashboardSnapshot } from './dashboard/getDashboardSnapshot'
```

## 7. Fallback front

Si function KO:

- lecture live des sources du tab actif
- rendu partiel avec warning

## 8. Plan de deploiement

1. coder functions dashboard tab-aware
2. deployer `firebase deploy --only functions`
3. verifier ecritures `dashboardAggregates`
4. brancher front `useDashboard(activeTab, filters)`

