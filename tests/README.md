# Structure des Tests — KARA

## Organisation

```
tests/
├── README.md                    # Ce fichier
├── __mocks__/                   # Mocks partagés
│   ├── firebase/                # Mocks Firebase
│   │   ├── firestore.ts         # Mock Firestore
│   │   ├── auth.ts              # Mock Auth
│   │   └── storage.ts           # Mock Storage
│   ├── repositories/            # Mocks des repositories
│   │   └── geography/           # Mocks géographie
│   │       ├── province.mock.ts
│   │       ├── department.mock.ts
│   │       ├── commune.mock.ts
│   │       ├── district.mock.ts
│   │       └── quarter.mock.ts
│   └── services/                # Mocks des services
│       └── geography.mock.ts
│
├── fixtures/                    # Données de test
│   ├── geography/               # Fixtures géographie
│   │   ├── provinces.json
│   │   ├── departments.json
│   │   ├── communes.json
│   │   ├── districts.json
│   │   └── quarters.json
│   ├── users/                   # Fixtures utilisateurs
│   │   └── admin-user.json
│   └── index.ts                 # Export des fixtures
│
├── helpers/                     # Utilitaires de test
│   ├── render-with-providers.tsx   # Wrapper pour tests React
│   ├── mock-query-client.ts        # QueryClient de test
│   ├── test-utils.ts               # Utilitaires généraux
│   └── e2e/                        # Helpers E2E
│       ├── auth.helper.ts          # Authentification E2E
│       └── navigation.helper.ts    # Navigation E2E
│
├── coverage-reports/            # Rapports de couverture (gitignored)
│   └── .gitkeep
│
└── results/                     # Résultats des tests (gitignored)
    ├── .gitkeep
    ├── unit-tests.json          # Résultats tests unitaires
    ├── e2e-tests.json           # Résultats tests E2E
    └── coverage-summary.json    # Résumé de couverture
```

## Types de Tests

### 1. Tests Unitaires (Vitest)
- **Localisation** : `src/**/__tests__/*.test.ts(x)`
- **Couverture cible** : ≥ 80% par module
- **Commande** : `pnpm test --run`

### 2. Tests d'Intégration (Vitest)
- **Localisation** : `src/**/__tests__/integration/*.test.ts(x)`
- **Couverture cible** : Flows critiques
- **Commande** : `pnpm test --run`

### 3. Tests E2E (Playwright)
- **Localisation** : `e2e/*.spec.ts`
- **Environnement** : Firebase Cloud (dev)
- **Commande** : `pnpm test:e2e`

## Utilisation des Mocks

### Import des mocks
```typescript
import { mockProvinceRepository } from '@/tests/__mocks__/repositories/geography/province.mock'
import { mockFirestore } from '@/tests/__mocks__/firebase/firestore'
```

### Import des fixtures
```typescript
import { provinceFixtures, departmentFixtures } from '@/tests/fixtures'
```

### Utilisation avec Vitest
```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockProvinceRepository } from '@/tests/__mocks__/repositories/geography/province.mock'

vi.mock('@/domains/infrastructure/geography/repositories/ProvinceRepositoryV2', () => ({
  ProvinceRepositoryV2: {
    getInstance: () => mockProvinceRepository
  }
}))
```

## Génération des Rapports

### Couverture
```bash
# Générer le rapport de couverture
pnpm test --run --coverage

# Rapport JSON
pnpm test --run --coverage --reporter=json --outputFile=tests/results/coverage-summary.json
```

### Résultats E2E
```bash
# Exécuter E2E avec rapport JSON
pnpm test:e2e --reporter=json --output=tests/results/e2e-tests.json
```

## Seuils de Couverture

| Module | Minimum | Cible |
|--------|---------|-------|
| Geography V2 | 80% | 90% |
| Auth | 80% | 85% |
| Membership | 70% | 80% |
| Services | 80% | 90% |
| Repositories | 80% | 90% |

## Bonnes Pratiques

1. **Isolation** : Chaque test doit être indépendant
2. **Mocks** : Utiliser les mocks partagés, ne pas dupliquer
3. **Fixtures** : Utiliser les fixtures JSON pour les données de test
4. **Nommage** : `should [action] when [condition]`
5. **Couverture** : Viser les branches, pas seulement les lignes
