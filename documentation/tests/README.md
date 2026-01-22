# Tests - Documentation & Checklist

> Stratégie de tests, checklist par module et guide d'implémentation pour le projet KARA.

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Structure des tests](#structure-des-tests)
3. [Checklist par module](#checklist-par-module)
4. [Tests E2E (Playwright)](#tests-e2e-playwright)
5. [Configuration](#configuration)
6. [Commandes](#commandes)
7. [Bonnes pratiques](#bonnes-pratiques)

---

## Vue d'ensemble

### Stratégie de tests

```
┌─────────────────────────────────────────────────────────────┐
│                    Tests E2E (Playwright)                    │
│              Parcours utilisateur complets                   │
│                     ~15% des tests                           │
├─────────────────────────────────────────────────────────────┤
│                Tests d'Intégration (Vitest)                  │
│           Interaction entre modules/services                 │
│                     ~25% des tests                           │
├─────────────────────────────────────────────────────────────┤
│                  Tests Unitaires (Vitest)                    │
│          Fonctions, hooks, services isolés                   │
│                     ~60% des tests                           │
└─────────────────────────────────────────────────────────────┘
```

### Objectifs de couverture

| Type | Couverture cible | Couverture minimale |
|------|------------------|---------------------|
| Tests unitaires | 90% | 80% |
| Tests d'intégration | Flows critiques | N/A |
| Tests E2E | Parcours principaux | N/A |

---

## Structure des tests

### Arborescence

```
kara-client-front/
├── tests/                           # Configuration et utilitaires partagés
│   ├── __mocks__/                   # Mocks partagés
│   │   ├── firebase/                # Mocks Firebase (firestore, auth, storage)
│   │   └── repositories/            # Mocks des repositories
│   │       ├── geography/           # Mocks géographie
│   │       └── references/          # Mocks entreprises/professions
│   ├── fixtures/                    # Données de test
│   │   ├── geography/               # Fixtures géographie (JSON)
│   │   └── images/                  # Images de test
│   ├── helpers/                     # Utilitaires de test
│   │   ├── render-with-providers.tsx
│   │   ├── test-utils.ts
│   │   └── e2e/                     # Helpers E2E
│   └── results/                     # Résultats (gitignored)
│
├── src/                             # Tests unitaires et d'intégration
│   └── domains/
│       └── {module}/
│           └── __tests__/
│               ├── unit/            # Tests unitaires
│               │   ├── services/
│               │   ├── repositories/
│               │   ├── hooks/
│               │   └── utils/
│               └── integration/     # Tests d'intégration
│
└── e2e/                             # Tests E2E (Playwright)
    ├── auth.spec.ts
    ├── registration.spec.ts
    ├── geographie.spec.ts
    ├── references.spec.ts
    ├── membership-requests-v2/      # Tests module demandes
    │   ├── list.spec.ts
    │   ├── details.spec.ts
    │   ├── approval.spec.ts
    │   └── ...
    └── helpers/                     # Helpers E2E
```

---

## Checklist par module

### Légende

- ✅ Test existant et fonctionnel
- 🔄 Test à mettre à jour
- ⏳ Test planifié (à implémenter)
- ❌ Non applicable

---

### Module: Auth

#### Tests Unitaires

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| AUTH-U-01 | LoginService - connexion réussie | `LoginService.test.ts` | ✅ |
| AUTH-U-02 | LoginService - identifiants invalides | `LoginService.test.ts` | ✅ |
| AUTH-U-03 | LogoutService - déconnexion | `LogoutService.test.ts` | ✅ |
| AUTH-U-04 | UserRepository - getById | `UserRepository.test.ts` | ✅ |
| AUTH-U-05 | UserRepository - getByEmail | `UserRepository.test.ts` | ✅ |

#### Tests E2E

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| AUTH-E-01 | Connexion admin | `auth.spec.ts` | ✅ |
| AUTH-E-02 | Déconnexion | `auth.spec.ts` | ✅ |
| AUTH-E-03 | Redirection si non authentifié | `auth.spec.ts` | ⏳ |
| AUTH-E-04 | Session persistante | `auth.spec.ts` | ⏳ |

---

### Module: Registration (Inscription publique)

#### Tests Unitaires

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| REG-U-01 | RegistrationService - soumission formulaire | `RegistrationService.test.ts` | ✅ |
| REG-U-02 | RegistrationService - validation données | `RegistrationService.test.ts` | ✅ |
| REG-U-03 | RegistrationCacheService - sauvegarde brouillon | `RegistrationCacheService.test.ts` | ✅ |
| REG-U-04 | RegistrationCacheService - restauration brouillon | `RegistrationCacheService.test.ts` | ✅ |
| REG-U-05 | RegistrationRepository - création demande | `RegistrationRepository.test.ts` | ✅ |

#### Tests E2E

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| REG-E-01 | Parcours inscription complet (4 étapes) | `registration.spec.ts` | ✅ |
| REG-E-02 | Sauvegarde automatique brouillon | `registration.spec.ts` | ⏳ |
| REG-E-03 | Restauration brouillon | `registration.spec.ts` | ⏳ |
| REG-E-04 | Soumission corrections | `registration/corrections.spec.ts` | ✅ |
| REG-E-05 | Validation code sécurité | `registration/corrections.spec.ts` | ✅ |

---

### Module: Membership Requests (Demandes d'adhésion)

#### Tests Unitaires - Services

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| MR-U-01 | MembershipServiceV2 - getAll avec filtres | `MembershipServiceV2.test.ts` | ✅ |
| MR-U-02 | MembershipServiceV2 - getById | `MembershipServiceV2.test.ts` | ✅ |
| MR-U-03 | MembershipServiceV2 - approve | `MembershipServiceV2.test.ts` | ✅ |
| MR-U-04 | MembershipServiceV2 - reject | `MembershipServiceV2.test.ts` | ✅ |
| MR-U-05 | MembershipFormService - validation | `MembershipFormService.test.ts` | ✅ |
| MR-U-06 | MembershipErrorHandler - gestion erreurs | `MembershipErrorHandler.test.ts` | ✅ |

#### Tests Unitaires - Repositories

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| MR-U-10 | MembershipRepositoryV2 - findAll | `MembershipRepositoryV2.test.ts` | ✅ |
| MR-U-11 | MembershipRepositoryV2 - findById | `MembershipRepositoryV2.test.ts` | ✅ |
| MR-U-12 | MembershipRepositoryV2 - update | `MembershipRepositoryV2.test.ts` | ✅ |
| MR-U-13 | PaymentRepositoryV2 - addPayment | `PaymentRepositoryV2.test.ts` | ✅ |
| MR-U-14 | PaymentRepositoryV2 - getPayments | `PaymentRepositoryV2.test.ts` | ✅ |

#### Tests Unitaires - Hooks

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| MR-U-20 | useMembershipRequestsV2 - liste paginée | `useMembershipRequestsV2.test.ts` | ✅ |
| MR-U-21 | useMembershipRequestDetails - détails | `useMembershipRequestDetails.test.ts` | ✅ |
| MR-U-22 | useMembershipActionsV2 - actions | `useMembershipActionsV2.test.ts` | ✅ |
| MR-U-23 | useMembershipStatsV2 - statistiques | `useMembershipStatsV2.test.ts` | ✅ |
| MR-U-24 | useApproveMembershipRequest - approbation | `useApproveMembershipRequest.test.ts` | ✅ |

#### Tests Unitaires - Utils

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| MR-U-30 | securityCode - génération | `securityCode.test.ts` | ✅ |
| MR-U-31 | securityCode - validation | `securityCode.test.ts` | ✅ |
| MR-U-32 | membershipValidation - règles | `membershipValidation.test.ts` | ✅ |
| MR-U-33 | correctionUtils - formatage | `correctionUtils.test.ts` | ✅ |
| MR-U-34 | whatsappUrl - génération URL | `whatsappUrl.test.ts` | ✅ |
| MR-U-35 | exportRequestUtils - export données | `exportRequestUtils.test.ts` | ✅ |
| MR-U-36 | paymentPDFUtils - génération PDF | `paymentPDFUtils.test.ts` | ✅ |
| MR-U-37 | formatAddress - formatage adresse | `formatAddress.test.ts` | ✅ |
| MR-U-38 | formatDateDetailed - formatage date | `formatDateDetailed.test.ts` | ✅ |
| MR-U-39 | isDateExpired - vérification expiration | `isDateExpired.test.ts` | ✅ |
| MR-U-40 | resolveAdhesionPdfUrl - URL PDF | `resolveAdhesionPdfUrl.test.ts` | ✅ |

#### Tests d'Intégration

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| MR-I-01 | Rejet demande (service → repo → Firestore) | `reject-membership-request.integration.test.ts` | ✅ |
| MR-I-02 | Export demandes (service → PDF) | `export.integration.test.ts` | ✅ |
| MR-I-03 | Approbation complète | - | ⏳ |
| MR-I-04 | Demande corrections (service → email) | - | ⏳ |

#### Tests E2E

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| MR-E-01 | Liste des demandes (pagination, filtres) | `list.spec.ts` | ✅ |
| MR-E-02 | Détails d'une demande | `details.spec.ts` | ✅ |
| MR-E-03 | Recherche (nom, matricule, email) | `search.spec.ts` | ✅ |
| MR-E-04 | Approbation simple | `approval.spec.ts` | ✅ |
| MR-E-05 | Approbation complète (paiement + PDF) | `approval-complete.spec.ts` | ✅ |
| MR-E-06 | Rejet avec motif | `rejection.spec.ts` | ✅ |
| MR-E-07 | Demande de corrections | `request-corrections.spec.ts` | ✅ |
| MR-E-08 | Soumission corrections demandeur | `corrections.spec.ts` | ✅ |
| MR-E-09 | Enregistrement paiement | `payment.spec.ts` | ✅ |
| MR-E-10 | Détails paiement | `payment-details.spec.ts` | ✅ |
| MR-E-11 | Export CSV/Excel | `export.spec.ts` | ✅ |
| MR-E-12 | Responsive (mobile/tablet) | `responsive.spec.ts` | ✅ |

---

### Module: Geography (Géographie)

#### Tests Unitaires - Repositories

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| GEO-U-01 | BaseGeographyRepository - CRUD générique | `BaseGeographyRepository.test.ts` | ✅ |
| GEO-U-02 | ProvinceRepositoryV2 - getAll | `ProvinceRepositoryV2.test.ts` | ✅ |
| GEO-U-03 | DepartmentRepositoryV2 - getByProvinceId | `DepartmentRepositoryV2.test.ts` | ✅ |
| GEO-U-04 | CommuneRepositoryV2 - getByDepartmentId | `CommuneRepositoryV2.test.ts` | ✅ |
| GEO-U-05 | DistrictRepositoryV2 - getByCommuneId | `DistrictRepositoryV2.test.ts` | ✅ |
| GEO-U-06 | QuarterRepositoryV2 - getByDistrictId | `QuarterRepositoryV2.test.ts` | ✅ |

#### Tests Unitaires - Services

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| GEO-U-10 | GeographieService - cascade Province→Quartier | `GeographieService.test.ts` | ✅ |
| GEO-U-11 | GeographieService - recherche | `GeographieService.test.ts` | ✅ |
| GEO-U-12 | GeographieService - création avec validation | `GeographieService.test.ts` | ✅ |

#### Tests Unitaires - Schemas

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| GEO-U-20 | ProvinceSchema - validation | `geographie.schema.test.ts` | ✅ |
| GEO-U-21 | DepartmentSchema - validation | `geographie.schema.test.ts` | ✅ |
| GEO-U-22 | CommuneSchema - validation | `geographie.schema.test.ts` | ✅ |

#### Tests E2E

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| GEO-E-01 | Page géographie (liste provinces) | `geographie.spec.ts` | ✅ |
| GEO-E-02 | Création province | `geographie.spec.ts` | ✅ |
| GEO-E-03 | Navigation onglets | `geographie.spec.ts` | ✅ |
| GEO-E-04 | Cascade dans formulaire inscription | `geographie.spec.ts` | ✅ |
| GEO-E-05 | Combobox Province/Ville/Arrondissement/Quartier | - | ⏳ |

---

### Module: References (Entreprises/Professions)

#### Tests Unitaires - Repositories

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| REF-U-01 | CompanyRepository - search | `CompanyRepository.test.ts` | ✅ |
| REF-U-02 | CompanyRepository - create | `CompanyRepository.test.ts` | ✅ |
| REF-U-03 | ProfessionRepository - search | `ProfessionRepository.test.ts` | ✅ |
| REF-U-04 | ProfessionRepository - create | `ProfessionRepository.test.ts` | ✅ |

#### Tests Unitaires - Services

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| REF-U-10 | CompanyService - recherche avec cache | `CompanyService.test.ts` | ✅ |
| REF-U-11 | CompanySuggestionsService - suggestions | `CompanySuggestionsService.test.ts` | ✅ |
| REF-U-12 | ProfessionService - recherche | `ProfessionService.test.ts` | ✅ |

#### Tests d'Intégration

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| REF-I-01 | Recherche + création entreprise | `references.integration.test.ts` | ✅ |

#### Tests E2E

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| REF-E-01 | Recherche entreprise dans formulaire | `references.spec.ts` | ✅ |
| REF-E-02 | Création nouvelle entreprise | `references.spec.ts` | ✅ |
| REF-E-03 | Recherche profession | `references.spec.ts` | ✅ |

---

### Module: Notifications

#### Tests Unitaires

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| NOTIF-U-01 | NotificationService - create | `NotificationService.test.ts` | ✅ |
| NOTIF-U-02 | NotificationService - markAsRead | `NotificationService.test.ts` | ✅ |
| NOTIF-U-03 | NotificationService - getByModule | `NotificationService.test.ts` | ✅ |

#### Tests E2E

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| NOTIF-E-01 | Affichage notifications | - | ⏳ |
| NOTIF-E-02 | Marquer comme lu | - | ⏳ |
| NOTIF-E-03 | Filtrage par module | - | ⏳ |

---

### Module: Utils (Utilitaires partagés)

#### Tests Unitaires

| ID | Description | Fichier | Status |
|----|-------------|---------|--------|
| UTIL-U-01 | pdfGenerator - génération PDF | `pdfGenerator.test.ts` | ✅ |
| UTIL-U-02 | approvalUtils - calculs approbation | `approvalUtils.test.ts` | ✅ |
| UTIL-U-03 | searchableText - normalisation | `searchableText.test.ts` | ✅ |
| UTIL-U-04 | AlgoliaSearchService - recherche | `AlgoliaSearchService.test.ts` | ✅ |

---

### Modules à tester (Planifiés)

Ces modules nécessitent des tests mais ne sont pas encore couverts :

| Module | Type | Priorité | Status |
|--------|------|----------|--------|
| Caisse Imprévue | Unit + E2E | Haute | ⏳ |
| Caisse Spéciale | Unit + E2E | Haute | ⏳ |
| Crédit Spéciale | Unit + E2E | Haute | ⏳ |
| Placement | Unit + E2E | Moyenne | ⏳ |
| Bienfaiteur | Unit + E2E | Moyenne | ⏳ |
| Véhicule | Unit + E2E | Basse | ⏳ |
| Members (liste) | Unit + E2E | Haute | ⏳ |

---

## Tests E2E (Playwright)

### Prérequis

```bash
# Installer Playwright
pnpm install
npx playwright install
```

### Configuration

Fichier : `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
});
```

### Variables d'environnement

```bash
# .env.test
E2E_AUTH_EMAIL=admin@kara.test
E2E_AUTH_PASSWORD=admin123
E2E_BASE_URL=http://localhost:3000
```

### Authentification

L'authentification est gérée automatiquement via `auth.setup.ts`. L'état est sauvegardé dans `playwright/.auth/admin.json`.

---

## Configuration

### Vitest (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/tests': path.resolve(__dirname, './tests'),
    },
  },
})
```

### Mocks partagés

```typescript
// tests/__mocks__/firebase/firestore.ts
import { vi } from 'vitest'

export const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}
```

---

## Commandes

### Tests unitaires et d'intégration

```bash
# Exécuter tous les tests
pnpm test

# Mode watch
pnpm test:watch

# Avec couverture
pnpm test:coverage

# Un fichier spécifique
pnpm test src/domains/memberships/__tests__/unit/services/MembershipServiceV2.test.ts

# Un pattern
pnpm test membership
```

### Tests E2E

```bash
# Tous les tests E2E
pnpm test:e2e

# Mode UI (interactif)
pnpm test:e2e:ui

# Mode debug
pnpm test:e2e:debug

# Un fichier spécifique
pnpm test:e2e e2e/membership-requests-v2/approval.spec.ts

# Voir le rapport
npx playwright show-report
```

### CI/CD

```bash
# Tests complets pour CI
pnpm test:ci

# E2E en mode CI
pnpm test:e2e --reporter=github
```

---

## Bonnes pratiques

### 1. Structure des tests

```typescript
describe('ModuleName', () => {
  describe('MethodOrFeature', () => {
    it('should [action] when [condition]', async () => {
      // Arrange
      const input = createTestData()
      
      // Act
      const result = await module.method(input)
      
      // Assert
      expect(result).toBe(expected)
    })
  })
})
```

### 2. Nommage

- **Fichiers** : `{Component|Service|Hook}.test.ts`
- **Descriptions** : `should [verbe] when [condition]`
- **Variables** : `mock{Name}`, `fake{Name}`, `stub{Name}`

### 3. Isolation

- Chaque test doit être indépendant
- Utiliser `beforeEach` pour reset le state
- Ne pas partager de données mutables entre tests

### 4. Mocks

```typescript
// ✅ Bon : Mock spécifique
vi.mock('@/services/api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'test' })
}))

// ❌ Mauvais : Mock global qui affecte tout
vi.mock('@/services/api')
```

### 5. Assertions

```typescript
// ✅ Bon : Assertions précises
expect(result.status).toBe('approved')
expect(result.approvedBy).toBe(adminId)
expect(result.approvedAt).toBeInstanceOf(Date)

// ❌ Mauvais : Assertion vague
expect(result).toBeTruthy()
```

### 6. Tests E2E

```typescript
// ✅ Bon : Sélecteurs robustes
await page.getByTestId('submit-button').click()
await page.getByRole('button', { name: 'Approuver' }).click()

// ❌ Mauvais : Sélecteurs fragiles
await page.click('.btn-primary')
await page.locator('button:nth-child(2)').click()
```

### 7. Données de test

- Utiliser les fixtures JSON pour les données statiques
- Générer des données uniques avec des helpers
- Nettoyer les données après les tests E2E

---

## Ressources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [MSW (Mock Service Worker)](https://mswjs.io/)
