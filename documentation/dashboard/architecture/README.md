# Architecture - Dashboard

> Architecture cible du module Dashboard en mode tabs-first et domains-first.

## 1. Objectif technique

Afficher des statistiques de pilotage multi-domaines sans degradations de performance, avec une navigation par tabs modules.

Tabs cibles:

- executive
- caisse_speciale
- caisse_imprevue
- credit_speciale
- credit_fixe
- caisse_aide
- placements
- administration
- recouvrement
- groupes
- metiers
- geographie

## 2. Arborescence cible

```text
src/domains/dashboard/
├── entities/
│   ├── dashboard.types.ts
│   └── dashboard-tabs.types.ts
├── schemas/
│   └── dashboard.schema.ts
├── repositories/
│   ├── DashboardRepository.ts
│   └── sources/
│       ├── ExecutiveStatsSource.ts
│       ├── CaisseSpecialeStatsSource.ts
│       ├── CaisseImprevueStatsSource.ts
│       ├── CreditStatsSource.ts
│       ├── PlacementStatsSource.ts
│       ├── AdminStatsSource.ts
│       ├── RecouvrementStatsSource.ts
│       ├── GroupStatsSource.ts
│       ├── MetierStatsSource.ts
│       └── GeographieStatsSource.ts
├── services/
│   ├── DashboardAggregationService.ts
│   └── calculators/
│       ├── executive.calculator.ts
│       ├── finance.calculator.ts
│       ├── administration.calculator.ts
│       ├── recouvrement.calculator.ts
│       ├── groupes.calculator.ts
│       ├── metiers.calculator.ts
│       └── geographie.calculator.ts
├── hooks/
│   ├── useDashboard.ts
│   ├── useDashboardTabs.ts
│   └── useDashboardFilters.ts
├── components/
│   ├── DashboardPage.tsx
│   ├── DashboardTabs.tsx
│   ├── DashboardFiltersBar.tsx
│   └── tabs/
│       ├── ExecutiveTab.tsx
│       ├── CaisseSpecialeTab.tsx
│       ├── CaisseImprevueTab.tsx
│       ├── CreditSpecialeTab.tsx
│       ├── CreditFixeTab.tsx
│       ├── CaisseAideTab.tsx
│       ├── PlacementsTab.tsx
│       ├── AdministrationTab.tsx
│       ├── RecouvrementTab.tsx
│       ├── GroupesTab.tsx
│       ├── MetiersTab.tsx
│       └── GeographieTab.tsx
└── __tests__/
    ├── services/
    └── hooks/
```

## 3. Flux principal tabs-first

1. `DashboardPage` lit `activeTab` + filtres.
2. `DashboardTabs` emet `onTabChange(tabKey)`.
3. `useDashboard` charge uniquement le snapshot du tab actif.
4. Service/repository renvoient les KPI du tab actif.
5. Le composant de tab rend ses widgets.

## 4. Strategie de cache

### 4.1 Couche 1 - React Query

- `queryKey`: `['dashboard', activeTab, periodKey, zone, memberType, moduleCompare]`
- `staleTime`: `5 min`
- `gcTime`: `30 min`
- `refetchOnWindowFocus`: `false`

### 4.2 Couche 2 - Firestore aggregates

Collection:

- `dashboardAggregates/{snapshotId}`

Format `snapshotId` recommande:

- `${periodKey}__${filtersHash}__${activeTab}`

Champs:

- `activeTab`
- `generatedAt`
- `ttlAt`
- `filtersHash`
- `snapshot`
- `version`

### 4.3 Couche 3 - etat local UI

- `localStorage.dashboard.activeTab`
- `localStorage.dashboard.filters`

## 5. Cloud Functions - Decision

Reponse: **oui, recommande**.

Fonctions cibles:

- `getDashboardSnapshot({ activeTab, filters })`
- `refreshDashboardSnapshot()` (scheduled)
- `buildDashboardSnapshot()` (interne)

Les functions calculent le tab demande (pas tous les tabs a chaque appel).

## 6. Contrat API tabs-first

```ts
export interface GetDashboardSnapshotInput {
  activeTab: DashboardTabKey
  period: { from: string; to: string }
  zone?: { province?: string; city?: string }
  memberType?: 'all' | 'adherant' | 'bienfaiteur' | 'sympathisant'
  moduleCompare?: 'all' | 'caisse' | 'credit' | 'placement'
  forceRefresh?: boolean
}

export interface GetDashboardSnapshotOutput {
  activeTab: DashboardTabKey
  generatedAt: string
  source: 'cache_ui' | 'cache_firestore' | 'cloud_function' | 'live_fallback'
  stale: boolean
  snapshot: unknown
}
```

## 7. Gestion d'erreurs

- Erreur d'un tab n'impacte pas les autres tabs.
- Fallback live possible tab par tab.
- UI affiche un warning limite au tab actif.

## 8. Plan de migration

1. Ajouter `DashboardTabs` et etat `activeTab`.
2. Migrer chaque section vers un composant de tab dedie.
3. Brancher cache key avec `activeTab`.
4. Brancher Cloud Functions tab-aware.
5. Supprimer le dashboard legacy mock.
