# Architecture des Tests — KARA

> Ce document décrit l'architecture des tests et des mocks pour le projet KARA.

---

## 1. Organisation des Fichiers

### Structure Principale

```
project-root/
├── tests/                        # Tests partagés et utilitaires
│   ├── README.md                 # Documentation des tests
│   ├── __mocks__/                # Mocks partagés
│   │   ├── firebase/             # Mocks Firebase
│   │   │   ├── firestore.ts      # Mock Firestore
│   │   │   ├── auth.ts           # Mock Auth
│   │   │   └── storage.ts        # Mock Storage
│   │   ├── repositories/         # Mocks des repositories
│   │   │   └── geography/        # Mocks géographie
│   │   └── services/             # Mocks des services
│   │
│   ├── fixtures/                 # Données de test
│   │   ├── geography/            # Fixtures géographie
│   │   ├── users/                # Fixtures utilisateurs
│   │   └── index.ts              # Export centralisé
│   │
│   ├── helpers/                  # Utilitaires de test
│   │   ├── render-with-providers.tsx
│   │   ├── test-utils.ts
│   │   └── e2e/                  # Helpers E2E
│   │
│   └── results/                  # Résultats des tests (gitignored)
│       ├── unit-tests.json
│       ├── e2e-tests.json
│       └── test-report.md
│
├── src/                          # Code source
│   └── domains/
│       └── <domain>/
│           └── __tests__/        # Tests du domaine
│               ├── hooks/
│               ├── repositories/
│               ├── services/
│               ├── schemas/
│               └── integration/
│
├── e2e/                          # Tests E2E Playwright
│   ├── auth.spec.ts
│   ├── geographie.spec.ts
│   └── ...
│
└── coverage/                     # Rapports de couverture (gitignored)
```

---

## 2. Types de Tests

### 2.1 Tests Unitaires

**Objectif** : Tester une unité de code en isolation.

**Localisation** : `src/**/__tests__/*.test.ts(x)`

**Framework** : Vitest

**Exemple** :
```typescript
// src/domains/infrastructure/geography/__tests__/repositories/ProvinceRepositoryV2.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockFirestoreModule } from '@/tests/__mocks__/firebase/firestore'

vi.mock('@/firebase/firestore', () => mockFirestoreModule)

describe('ProvinceRepositoryV2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch provinces with pagination', async () => {
    // Arrange
    // Act
    // Assert
  })
})
```

### 2.2 Tests d'Intégration

**Objectif** : Tester l'interaction entre plusieurs unités.

**Localisation** : `src/**/__tests__/integration/*.test.ts(x)`

**Framework** : Vitest + Testing Library

### 2.3 Tests E2E

**Objectif** : Tester le comportement utilisateur complet.

**Localisation** : `e2e/*.spec.ts`

**Framework** : Playwright

**Exemple** :
```typescript
// e2e/geographie.spec.ts
import { test, expect } from '@playwright/test'
import { authenticateUser } from '@/tests/helpers/e2e/auth.helper'

test.describe('Géographie - Provinces', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page)
    await page.goto('/geographie')
  })

  test('should display province list', async ({ page }) => {
    await expect(page.locator('[data-testid="province-list"]')).toBeVisible()
  })
})
```

---

## 3. Gestion des Mocks

### 3.1 Principes

1. **Centralisation** : Tous les mocks dans `tests/__mocks__/`
2. **Réutilisabilité** : Un mock par module/service
3. **Consistance** : Même interface que le code réel
4. **Reset** : Fonction `reset*Mocks()` pour chaque mock

### 3.2 Structure d'un Mock

```typescript
// tests/__mocks__/repositories/geography/province.mock.ts
import { vi } from 'vitest'

// Données par défaut
export const mockProvinces = [...]

// Mock du repository
export const mockProvinceRepository = {
  getPaginated: vi.fn().mockResolvedValue({...}),
  getCount: vi.fn().mockResolvedValue(5),
  create: vi.fn().mockImplementation((data) => {...}),
  update: vi.fn().mockImplementation((id, data) => {...}),
  delete: vi.fn().mockResolvedValue(undefined),
}

// Helpers pour configurer le mock
export function setupPaginatedResponse(provinces, hasNextPage = false) {...}

// Reset des mocks
export function resetProvinceRepositoryMocks() {...}
```

### 3.3 Utilisation dans les Tests

```typescript
// Importer le mock
import { mockProvinceRepository, setupPaginatedResponse } from '@/tests/__mocks__/repositories/geography/province.mock'

// Mocker le module
vi.mock('@/domains/infrastructure/geography/repositories/ProvinceRepositoryV2', () => ({
  ProvinceRepositoryV2: {
    getInstance: () => mockProvinceRepository
  }
}))

// Dans le test
beforeEach(() => {
  setupPaginatedResponse(mockProvinces, true) // Avec pagination
})
```

---

## 4. Gestion des Fixtures

### 4.1 Format

```json
// tests/fixtures/geography/provinces.json
{
  "provinces": [...],
  "pagination": {
    "page1": { "provinces": [...], "hasNextPage": true },
    "page2": { "provinces": [...], "hasNextPage": false }
  },
  "search": {
    "ogooue": ["prov-2", "prov-3"],
    "est": ["prov-1"]
  }
}
```

### 4.2 Export Centralisé

```typescript
// tests/fixtures/index.ts
import provincesData from './geography/provinces.json'

export const provinceFixtures = provincesData.provinces
export const provincePaginationFixtures = provincesData.pagination

// Helpers
export function getProvinceById(id: string) {...}
export function searchProvinces(query: string) {...}
```

---

## 5. Stratégie de Couverture

### 5.1 Seuils par Module

| Module | Minimum | Cible |
|--------|---------|-------|
| Repositories V2 | 80% | 90% |
| Hooks V2 | 80% | 90% |
| Services | 80% | 90% |
| Schemas | 90% | 95% |
| Components | 70% | 80% |

### 5.2 Configuration Vitest

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/domains/**/*.ts',
        'src/hooks/**/*.ts',
      ],
      exclude: [
        // V1 (legacy)
        '**/v1/**',
        // Types
        '**/*.d.ts',
        '**/types/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      }
    }
  }
})
```

---

## 6. Scripts NPM

```bash
# Tests unitaires
pnpm test                    # Mode watch
pnpm test:run                # Exécution unique
pnpm test:coverage           # Avec couverture

# Tests E2E
pnpm test:e2e                # Exécution
pnpm test:e2e:ui             # Interface graphique
pnpm test:e2e:headed         # Avec navigateur visible

# Tous les tests
pnpm test:all                # Unit + E2E
pnpm test:all:report         # Avec rapport consolidé
```

---

## 7. Bonnes Pratiques

### 7.1 Nommage

- **Tests** : `should [action] when [condition]`
- **Fichiers** : `*.test.ts` (unit) / `*.spec.ts` (e2e)
- **Mocks** : `*.mock.ts`
- **Fixtures** : `*.json`

### 7.2 Organisation des Tests

```typescript
describe('ComponentName', () => {
  describe('when initialized', () => {
    it('should render correctly', () => {})
    it('should display default values', () => {})
  })

  describe('when user interacts', () => {
    it('should update on click', () => {})
    it('should submit form on enter', () => {})
  })

  describe('error handling', () => {
    it('should show error message on failure', () => {})
    it('should retry on network error', () => {})
  })
})
```

### 7.3 Assertions

```typescript
// Préférer des assertions explicites
expect(result).toEqual({ id: '1', name: 'Test' })

// Au lieu de
expect(result.id).toBe('1')
expect(result.name).toBe('Test')
```

### 7.4 Tests Async

```typescript
// Utiliser async/await
it('should fetch data', async () => {
  const result = await fetchData()
  expect(result).toBeDefined()
})

// Avec waitFor pour les changements d'état
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeVisible()
})
```

---

## 8. Checklist Nouveau Test

- [ ] Fichier dans le bon dossier (`__tests__/`)
- [ ] Imports des mocks depuis `tests/__mocks__/`
- [ ] Fixtures depuis `tests/fixtures/`
- [ ] `beforeEach` avec reset des mocks
- [ ] Tests couvrent les cas : succès, erreur, edge cases
- [ ] Pas de console.log oublié
- [ ] Test passe en isolation (`pnpm test -- --run MyTest`)
