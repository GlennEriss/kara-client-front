# Workflow d'Implémentation - Module Membership Requests V2

Ce document définit le workflow **étape par étape** pour l'implémentation du refactoring du module de gestion des demandes d'adhésion. Il est basé sur toute l'analyse réalisée et doit être suivi **à la lettre**.

---

## Sommaire

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Prérequis](#2-prérequis)
3. [Phase 0 : Préparation](#phase-0--préparation)
4. [Phase 1 : Infrastructure (TDD)](#phase-1--infrastructure-tdd)
5. [Phase 2 : Services Métier (TDD)](#phase-2--services-métier-tdd)
6. [Phase 3 : Hooks React Query (TDD)](#phase-3--hooks-react-query-tdd)
7. [Phase 4 : Composants UI V2 (Test-After)](#phase-4--composants-ui-v2-test-after)
8. [Phase 5 : Intégration Page](#phase-5--intégration-page)
9. [Phase 6 : Tests E2E](#phase-6--tests-e2e)
10. [Phase 7 : Validation et Déploiement](#phase-7--validation-et-déploiement)
11. [Checklist Globale](#checklist-globale)

---

## 1. Vue d'Ensemble

### 1.1 Objectif

Refactoriser le module `membership-requests` en créant une version V2 avec :
- ✅ Architecture propre (Repository → Service → Hook → Component)
- ✅ Tests TDD pour la logique métier
- ✅ Composants UI modernes (Tableau + Cards responsive)
- ✅ Actions principales visibles (non cachées dans dropdown)
- ✅ Notifications et intégration WhatsApp
- ✅ Code maintenable et testable

### 1.2 Documentation de Référence

| Document | Contenu | Chemin |
|----------|---------|--------|
| **ANALYSE_ACTUELLE.md** | État actuel du module | `./ANALYSE_ACTUELLE.md` |
| **CRITIQUE_ARCHITECTURE.md** | Points à améliorer | `./CRITIQUE_ARCHITECTURE.md` |
| **POINTS_A_CORRIGER.md** | Actions à prendre | `./POINTS_A_CORRIGER.md` |
| **WIREFRAME_UI.md** | Maquette UI | `./WIREFRAME_UI.md` |
| **PLAN_TESTS_TDD.md** | Plan de tests complet | `./PLAN_TESTS_TDD.md` |
| **DIAGRAMMES_ACTIVITE.puml** | Diagrammes d'activité | `./DIAGRAMMES_ACTIVITE.puml` |
| **DIAGRAMMES_SEQUENCE.puml** | Diagrammes de séquence | `./DIAGRAMMES_SEQUENCE.puml` |
| **FIREBASE_RULES_INDEXES.md** | Règles et index Firebase | `./FIREBASE_RULES_INDEXES.md` |
| **PLAN_NOTIFICATIONS.md** | Plan notifications | `./PLAN_NOTIFICATIONS.md` |
| **ANALYSE_WHATSAPP.md** | Intégration WhatsApp | `./ANALYSE_WHATSAPP.md` |
| **DESIGN_SYSTEM_UI.md** | Composants UI réutilisables | `./DESIGN_SYSTEM_UI.md` |
| **Constantes** | Valeurs centralisées | `src/constantes/membership-requests.ts` |

### 1.3 Stratégie V1 → V2

```
┌─────────────────────────────────────────────────────────────────┐
│                    STRATÉGIE DE MIGRATION                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CONSERVER les composants V1 intacts                         │
│     → Ne pas modifier `MembershipRequestsList.tsx`              │
│     → Ne pas modifier `MembershipRequestCard.tsx`               │
│                                                                 │
│  2. CRÉER les composants V2 en parallèle                        │
│     → Nouveau dossier `src/domains/memberships/`                │
│     → Nouveaux composants testables                             │
│                                                                 │
│  3. TESTER les composants V2 avant migration                    │
│     → Tests unitaires                                           │
│     → Tests d'intégration                                       │
│     → Tests E2E                                                 │
│                                                                 │
│  4. MIGRER progressivement                                      │
│     → Activer V2 sur une route `/membership-requests-v2`        │
│     → Valider en préprod                                        │
│     → Remplacer V1 par V2                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Prérequis

### 2.1 Branche Git

```bash
# Créer la branche de refactoring
git checkout develop
git pull origin develop
git checkout -b refactor/membership-requests-v2
```

### 2.2 Structure de Dossiers à Créer

```
src/domains/memberships/
├── entities/
│   ├── index.ts                      # Exports
│   ├── MembershipRequest.ts          # Type principal
│   ├── MembershipRequestStatus.ts    # Enum des statuts
│   └── PaymentInfo.ts                # Type paiement
│
├── repositories/
│   ├── interfaces/
│   │   └── IMembershipRepository.ts  # Interface
│   ├── MembershipRepositoryV2.ts     # Implémentation
│   └── index.ts
│
├── services/
│   ├── interfaces/
│   │   ├── IMembershipService.ts
│   │   └── IMembershipNotificationService.ts
│   ├── MembershipServiceV2.ts
│   ├── MembershipApprovalServiceV2.ts
│   ├── MembershipNotificationServiceV2.ts
│   └── index.ts
│
├── hooks/
│   ├── useMembershipRequestsV2.ts
│   ├── useMembershipActionsV2.ts
│   ├── useMembershipStatsV2.ts
│   └── index.ts
│
├── components/
│   ├── table/
│   │   ├── MembershipRequestsTableV2.tsx
│   │   └── MembershipRequestRowV2.tsx
│   ├── cards/
│   │   └── MembershipRequestMobileCardV2.tsx
│   ├── actions/
│   │   ├── MembershipRequestActionsV2.tsx
│   │   ├── ApproveModalV2.tsx
│   │   ├── RejectModalV2.tsx
│   │   ├── CorrectionsModalV2.tsx
│   │   └── PaymentModalV2.tsx
│   ├── shared/
│   │   ├── StatusBadgeV2.tsx
│   │   ├── PaymentBadgeV2.tsx
│   │   ├── RelativeDateV2.tsx
│   │   └── CorrectionBannerV2.tsx
│   └── layout/
│       ├── MembershipRequestsPageV2.tsx
│       └── MembershipRequestsFiltersV2.tsx
│
├── utils/
│   ├── securityCode.ts
│   ├── whatsappUrl.ts
│   ├── membershipValidation.ts
│   ├── membershipFormatters.ts
│   └── index.ts
│
├── schemas/
│   ├── paymentSchema.ts
│   ├── rejectSchema.ts
│   ├── correctionsSchema.ts
│   └── index.ts
│
└── __tests__/
    ├── fixtures/
    ├── mocks/
    ├── unit/
    └── integration/
```

### 2.3 Déployer les Règles et Index Firebase

```bash
# 1. Vérifier que les fichiers sont à jour
cat firestore.rules
cat storage.rules
cat firestore.indexes.json

# 2. Déployer sur le projet dev
firebase use dev
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage

# 3. Attendre que les index soient construits
# Vérifier dans Firebase Console > Firestore > Indexes
```

---

## Phase 0 : Préparation

**Durée estimée : 1 jour**

### Étape 0.1 : Créer la Structure de Dossiers

```bash
# Créer les dossiers
mkdir -p src/domains/memberships/{entities,repositories/interfaces,services/interfaces,hooks,components/{table,cards,actions,shared,layout},utils,schemas,__tests__/{fixtures,mocks,unit,integration}}
```

### Étape 0.2 : Créer les Fichiers d'Index

```typescript
// src/domains/memberships/index.ts
export * from './entities'
export * from './repositories'
export * from './services'
export * from './hooks'
export * from './utils'
export * from './schemas'
```

### Étape 0.3 : Copier les Fixtures et Mocks

Créer les fichiers de fixtures selon `PLAN_TESTS_TDD.md` :

```typescript
// src/domains/memberships/__tests__/fixtures/membership-request.fixture.ts
// Copier le contenu de PLAN_TESTS_TDD.md section 6.1
```

### Étape 0.4 : Configurer Vitest pour le Nouveau Module

```typescript
// vitest.config.ts - Ajouter les seuils de couverture
'src/domains/memberships/repositories/**': {
  lines: 80,
  functions: 80,
  branches: 80,
  statements: 80,
},
'src/domains/memberships/services/**': {
  lines: 80,
  functions: 80,
  branches: 80,
  statements: 80,
},
'src/domains/memberships/hooks/**': {
  lines: 80,
  functions: 80,
  branches: 80,
  statements: 80,
},
```

### Checklist Phase 0

- [ ] Branche `refactor/membership-requests-v2` créée
- [ ] Structure de dossiers créée
- [ ] Fichiers d'index créés
- [ ] Fixtures copiées
- [ ] Configuration Vitest mise à jour
- [ ] Règles Firebase déployées sur dev
- [ ] Index Firebase construits

---

## Phase 1 : Infrastructure (TDD)

**Durée estimée : 3 jours**

> **Approche TDD stricte** : Écrire les tests AVANT le code.

### Étape 1.1 : Entités

#### 1.1.1 Créer les Types

```typescript
// src/domains/memberships/entities/MembershipRequest.ts
import { MembershipRequest as LegacyMembershipRequest } from '@/types/types'

// Réutiliser le type existant, ajouter des extensions si nécessaire
export type MembershipRequest = LegacyMembershipRequest

// Types additionnels pour le module V2
export interface MembershipRequestFilters {
  status?: MembershipRequest['status']
  isPaid?: boolean
  search?: string
}

export interface MembershipRequestPagination {
  page: number
  limit: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface MembershipRequestsResponse {
  items: MembershipRequest[]
  pagination: MembershipRequestPagination
}
```

### Étape 1.2 : Repository (TDD)

#### 1.2.1 Écrire les Tests d'Abord

```bash
# Créer le fichier de test
touch src/domains/memberships/__tests__/unit/repositories/MembershipRepositoryV2.test.ts
```

```typescript
// src/domains/memberships/__tests__/unit/repositories/MembershipRepositoryV2.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MembershipRepositoryV2 } from '../../../repositories/MembershipRepositoryV2'
import { createMembershipRequestFixture, generateManyRequests } from '../../fixtures'

// Mock Firestore
vi.mock('@/firebase/clientApp', () => ({
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
        update: vi.fn().mockResolvedValue(undefined),
      })),
      where: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({ docs: [] }),
          })),
        })),
      })),
    })),
  },
}))

describe('MembershipRepositoryV2', () => {
  let repository: MembershipRepositoryV2

  beforeEach(() => {
    vi.clearAllMocks()
    repository = MembershipRepositoryV2.getInstance()
  })

  describe('getAll', () => {
    it('devrait retourner une liste paginée de demandes', async () => {
      // Arrange
      const mockDocs = generateManyRequests(10).map(req => ({
        id: req.id,
        data: () => req,
      }))
      
      // TODO: Configurer le mock pour retourner mockDocs
      
      // Act
      const result = await repository.getAll({ page: 1, limit: 10 })
      
      // Assert
      expect(result.items).toHaveLength(10)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(10)
    })

    it('devrait filtrer par statut', async () => {
      // Test à implémenter
    })

    it('devrait retourner une liste vide si aucune demande', async () => {
      // Test à implémenter
    })

    // ... autres tests selon PLAN_TESTS_TDD.md
  })

  describe('getById', () => {
    it('devrait retourner une demande par son ID', async () => {
      // Test à implémenter
    })

    it('devrait retourner null si ID inexistant', async () => {
      // Test à implémenter
    })
  })

  describe('updateStatus', () => {
    // Tests selon PLAN_TESTS_TDD.md
  })

  describe('markAsPaid', () => {
    // Tests selon PLAN_TESTS_TDD.md
  })

  describe('getStatistics', () => {
    // Tests selon PLAN_TESTS_TDD.md
  })
})
```

#### 1.2.2 Exécuter les Tests (Doivent Échouer - RED)

```bash
pnpm test src/domains/memberships/__tests__/unit/repositories/MembershipRepositoryV2.test.ts
```

#### 1.2.3 Implémenter le Repository (GREEN)

```typescript
// src/domains/memberships/repositories/interfaces/IMembershipRepository.ts
import { 
  MembershipRequest, 
  MembershipRequestFilters, 
  MembershipRequestsResponse 
} from '../../entities'

export interface IMembershipRepository {
  getAll(filters?: MembershipRequestFilters, page?: number, limit?: number): Promise<MembershipRequestsResponse>
  getById(id: string): Promise<MembershipRequest | null>
  updateStatus(id: string, status: MembershipRequest['status'], data?: Partial<MembershipRequest>): Promise<void>
  markAsPaid(id: string, paymentInfo: MembershipRequest['paymentInfo']): Promise<void>
  getStatistics(): Promise<MembershipStatistics>
  search(query: string, filters?: MembershipRequestFilters): Promise<MembershipRequest[]>
}
```

```typescript
// src/domains/memberships/repositories/MembershipRepositoryV2.ts
import { db } from '@/firebase/clientApp'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore'
import { IMembershipRepository } from './interfaces/IMembershipRepository'
import { 
  MembershipRequest, 
  MembershipRequestFilters, 
  MembershipRequestsResponse,
  MembershipStatistics,
} from '../entities'
import { MEMBERSHIP_REQUEST_COLLECTIONS, MEMBERSHIP_REQUEST_PAGINATION } from '@/constantes/membership-requests'

export class MembershipRepositoryV2 implements IMembershipRepository {
  private static instance: MembershipRepositoryV2
  private readonly collectionName = MEMBERSHIP_REQUEST_COLLECTIONS.REQUESTS

  private constructor() {}

  static getInstance(): MembershipRepositoryV2 {
    if (!MembershipRepositoryV2.instance) {
      MembershipRepositoryV2.instance = new MembershipRepositoryV2()
    }
    return MembershipRepositoryV2.instance
  }

  async getAll(
    filters?: MembershipRequestFilters, 
    page: number = 1, 
    pageLimit: number = MEMBERSHIP_REQUEST_PAGINATION.DEFAULT_PAGE_SIZE
  ): Promise<MembershipRequestsResponse> {
    // Implémentation selon les diagrammes de séquence
    // ...
  }

  async getById(id: string): Promise<MembershipRequest | null> {
    // Implémentation
  }

  async updateStatus(
    id: string, 
    status: MembershipRequest['status'], 
    data?: Partial<MembershipRequest>
  ): Promise<void> {
    // Implémentation avec validation
  }

  async markAsPaid(id: string, paymentInfo: MembershipRequest['paymentInfo']): Promise<void> {
    // Implémentation
  }

  async getStatistics(): Promise<MembershipStatistics> {
    // Implémentation - CORRECTE (pas celle du code actuel)
    // Utiliser getCountFromServer() pour chaque statut
  }

  async search(query: string, filters?: MembershipRequestFilters): Promise<MembershipRequest[]> {
    // Implémentation - Recherche côté serveur (Algolia ou Firestore)
    // PAS la recherche client-side actuelle
  }
}
```

#### 1.2.4 Exécuter les Tests (Doivent Passer - GREEN)

```bash
pnpm test src/domains/memberships/__tests__/unit/repositories/MembershipRepositoryV2.test.ts
```

#### 1.2.5 Refactoriser si Nécessaire (REFACTOR)

### Étape 1.3 : Utils (TDD)

Suivre le même processus TDD pour :
- `securityCode.ts` (tests → implémentation)
- `whatsappUrl.ts` (tests → implémentation)
- `membershipValidation.ts` (tests → implémentation)

### Checklist Phase 1

- [ ] Tests Repository écrits (RED)
- [ ] Repository implémenté (GREEN)
- [ ] Tests Repository passent
- [ ] Tests Utils écrits (RED)
- [ ] Utils implémentés (GREEN)
- [ ] Tests Utils passent
- [ ] Couverture > 80% pour repositories et utils
- [ ] Commit : `feat(memberships): add MembershipRepositoryV2 with tests`

---

## Phase 2 : Services Métier (TDD)

**Durée estimée : 4 jours**

### Étape 2.1 : MembershipServiceV2 (TDD)

#### 2.1.1 Écrire les Tests d'Abord

```typescript
// src/domains/memberships/__tests__/unit/services/MembershipServiceV2.test.ts
describe('MembershipServiceV2', () => {
  describe('approveMembershipRequest', () => {
    // Tests selon PLAN_TESTS_TDD.md section 3.2.1
  })
})
```

#### 2.1.2 Implémenter le Service

```typescript
// src/domains/memberships/services/MembershipServiceV2.ts
// Suivre les diagrammes de séquence pour l'implémentation
```

### Étape 2.2 : MembershipApprovalServiceV2 (TDD)

Service dédié à l'approbation avec gestion du rollback.

### Étape 2.3 : MembershipNotificationServiceV2 (TDD)

Service de notifications selon `PLAN_NOTIFICATIONS.md`.

### Checklist Phase 2

- [ ] Tests MembershipServiceV2 écrits et passent
- [ ] Tests MembershipApprovalServiceV2 écrits et passent
- [ ] Tests MembershipNotificationServiceV2 écrits et passent
- [ ] Couverture > 80% pour services
- [ ] Commit : `feat(memberships): add MembershipServiceV2 with tests`

---

## Phase 3 : Hooks React Query (TDD)

**Durée estimée : 2 jours**

### Étape 3.1 : useMembershipRequestsV2 (TDD)

```typescript
// src/domains/memberships/hooks/useMembershipRequestsV2.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MembershipServiceV2 } from '../services/MembershipServiceV2'
import { MEMBERSHIP_REQUEST_CACHE } from '@/constantes/membership-requests'

export function useMembershipRequestsV2(filters, page, limit) {
  const queryClient = useQueryClient()
  const service = MembershipServiceV2.getInstance()

  const query = useQuery({
    queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY, filters, page],
    queryFn: () => service.getAll(filters, page, limit),
    staleTime: MEMBERSHIP_REQUEST_CACHE.STALE_TIME,
  })

  // Invalidation, refetch, etc.

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    // ...
  }
}
```

### Étape 3.2 : useMembershipActionsV2 (TDD)

Hook pour les actions (approve, reject, corrections, pay).

### Étape 3.3 : useMembershipStatsV2 (TDD)

Hook pour les statistiques (corrigées).

### Checklist Phase 3

- [ ] Tests useMembershipRequestsV2 écrits et passent
- [ ] Tests useMembershipActionsV2 écrits et passent
- [ ] Tests useMembershipStatsV2 écrits et passent
- [ ] Couverture > 80% pour hooks
- [ ] Commit : `feat(memberships): add React Query hooks V2 with tests`

---

## Phase 4 : Composants UI V2 (Test-After)

**Durée estimée : 5 jours**

> **Approche Test-After** pour les composants UI car on itère rapidement sur le design.

### Étape 4.1 : Composants Partagés

#### 4.1.1 StatusBadgeV2

```typescript
// src/domains/memberships/components/shared/StatusBadgeV2.tsx
import { Badge } from '@/components/ui/badge'
import { MEMBERSHIP_REQUEST_UI_COLORS } from '@/constantes/membership-requests'

interface StatusBadgeV2Props {
  status: MembershipRequest['status']
  className?: string
}

export function StatusBadgeV2({ status, className }: StatusBadgeV2Props) {
  const config = MEMBERSHIP_REQUEST_UI_COLORS.STATUS[status]
  
  return (
    <Badge 
      className={cn(config.badge, className)}
      data-testid="status-badge"
    >
      <config.icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  )
}
```

#### 4.1.2 PaymentBadgeV2

Suivre le même pattern.

#### 4.1.3 RelativeDateV2

Suivre `WIREFRAME_UI.md` section 6.4.

#### 4.1.4 CorrectionBannerV2

Bandeau pour afficher les corrections demandées.

### Étape 4.2 : MembershipRequestActionsV2

**Composant critique** - Actions visibles selon `WIREFRAME_UI.md` section 4.

```typescript
// src/domains/memberships/components/actions/MembershipRequestActionsV2.tsx
// Suivre WIREFRAME_UI.md section 10.1
```

### Étape 4.3 : MembershipRequestRowV2

Ligne de tableau selon `WIREFRAME_UI.md` section 5.2.

### Étape 4.4 : MembershipRequestsTableV2

Tableau complet pour desktop.

### Étape 4.5 : MembershipRequestMobileCardV2

Card pour mobile selon `WIREFRAME_UI.md` section 5.4.

### Étape 4.6 : Modals

- ApproveModalV2
- RejectModalV2
- CorrectionsModalV2 (avec WhatsApp)
- PaymentModalV2

### Étape 4.7 : Écrire les Tests Après (Test-After)

```typescript
// src/domains/memberships/__tests__/unit/components/MembershipRequestActionsV2.test.tsx
describe('MembershipRequestActionsV2', () => {
  describe('rendu conditionnel', () => {
    it('devrait afficher Approuver si canApprove=true', () => {})
    it('devrait afficher Payer si canPay=true', () => {})
    // ...
  })
})
```

### Checklist Phase 4

- [ ] StatusBadgeV2 créé
- [ ] PaymentBadgeV2 créé
- [ ] RelativeDateV2 créé
- [ ] CorrectionBannerV2 créé
- [ ] MembershipRequestActionsV2 créé
- [ ] MembershipRequestRowV2 créé
- [ ] MembershipRequestsTableV2 créé
- [ ] MembershipRequestMobileCardV2 créé
- [ ] Tous les modals créés
- [ ] Tests composants écrits
- [ ] Design System KARA respecté
- [ ] Responsive vérifié
- [ ] Commit : `feat(memberships): add UI components V2`

---

## Phase 5 : Intégration Page

**Durée estimée : 2 jours**

### Étape 5.1 : Créer la Page V2

```typescript
// src/app/(admin)/membership-requests-v2/page.tsx
import { MembershipRequestsPageV2 } from '@/domains/memberships/components/layout/MembershipRequestsPageV2'

export default function MembershipRequestsV2Page() {
  return <MembershipRequestsPageV2 />
}
```

### Étape 5.2 : Créer le Layout Principal

```typescript
// src/domains/memberships/components/layout/MembershipRequestsPageV2.tsx
'use client'

import { DashboardPageLayout } from '@/components/layouts/DashboardPageLayout'
import { useMembershipRequestsV2 } from '../../hooks/useMembershipRequestsV2'
import { useMembershipStatsV2 } from '../../hooks/useMembershipStatsV2'
import { MembershipRequestsTableV2 } from '../table/MembershipRequestsTableV2'
import { MembershipRequestMobileCardV2 } from '../cards/MembershipRequestMobileCardV2'
import { MembershipRequestsFiltersV2 } from './MembershipRequestsFiltersV2'
import { SearchInput } from '@/components/ui/search-input'
import { Pagination } from '@/components/ui/pagination'
import { FilterBar } from '@/components/ui/filter-bar'
import { useMediaQuery } from '@/hooks/useMediaQuery'

export function MembershipRequestsPageV2() {
  // State pour filtres, pagination, recherche
  const [filters, setFilters] = useState<MembershipRequestFilters>({})
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  // Hooks
  const { data, isLoading, error } = useMembershipRequestsV2(filters, page)
  const { stats } = useMembershipStatsV2()
  const isMobile = useMediaQuery('(max-width: 640px)')

  // Handlers
  const handleStatusFilter = (status: string | null) => {
    setFilters(prev => ({ ...prev, status: status as any }))
    setPage(1)
  }

  const handleSearch = (query: string) => {
    setSearch(query)
    setPage(1)
  }

  return (
    <DashboardPageLayout
      title="Demandes d'Adhésion"
      description="Gérez les demandes d'inscription des membres"
    >
      {/* Statistiques */}
      <StatsSection stats={stats} />

      {/* Filtres et Recherche */}
      <FilterBar
        filters={MEMBERSHIP_REQUEST_STATUSES.map(s => ({
          id: s.value,
          label: s.label,
          active: filters.status === s.value,
        }))}
        onFilterChange={handleStatusFilter}
      />

      <SearchInput
        placeholder="Rechercher par nom, email, téléphone..."
        onSearch={handleSearch}
        className="max-w-md"
      />

      {/* Liste */}
      {isMobile ? (
        <div className="space-y-4">
          {data?.items.map(request => (
            <MembershipRequestMobileCardV2
              key={request.id}
              request={request}
            />
          ))}
        </div>
      ) : (
        <MembershipRequestsTableV2
          requests={data?.items || []}
          isLoading={isLoading}
        />
      )}

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={data?.pagination.totalPages || 1}
        onPageChange={setPage}
      />
    </DashboardPageLayout>
  )
}
```

### Étape 5.3 : Tester l'Intégration Localement

```bash
# Démarrer le serveur de dev
pnpm dev

# Accéder à la page V2
# http://localhost:3000/membership-requests-v2
```

### Checklist Phase 5

- [ ] Page V2 créée (`/membership-requests-v2`)
- [ ] Layout principal fonctionne
- [ ] Filtres fonctionnent
- [ ] Recherche fonctionne
- [ ] Pagination fonctionne
- [ ] Actions fonctionnent (Approuver, Rejeter, etc.)
- [ ] Responsive vérifié
- [ ] Commit : `feat(memberships): integrate MembershipRequestsPageV2`

---

## Phase 6 : Tests E2E

**Durée estimée : 3 jours**

### Étape 6.1 : Créer les Tests E2E

```typescript
// e2e/membership-requests-v2/list.spec.ts
import { test, expect } from '@playwright/test'

test.describe('E2E: Liste des demandes V2', () => {
  test.beforeEach(async ({ page }) => {
    // Connexion admin
    await page.goto('/login')
    await page.fill('[name="email"]', 'admin@test.com')
    await page.fill('[name="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    // Aller sur la page V2
    await page.goto('/membership-requests-v2')
    await page.waitForLoadState('networkidle')
  })

  test('devrait afficher la liste des demandes', async ({ page }) => {
    // Suivre PLAN_TESTS_TDD.md section 5.2
  })

  test('devrait filtrer par statut', async ({ page }) => {
    // ...
  })

  // ... autres tests
})
```

### Étape 6.2 : Exécuter les Tests E2E

```bash
# Avec le serveur de dev
pnpm test:e2e e2e/membership-requests-v2/

# Avec interface graphique
pnpm test:e2e:ui
```

### Checklist Phase 6

- [ ] Tests E2E liste écrits et passent
- [ ] Tests E2E approbation écrits et passent
- [ ] Tests E2E rejet écrits et passent
- [ ] Tests E2E corrections écrits et passent
- [ ] Tests E2E paiement écrits et passent
- [ ] Tests E2E responsive passent
- [ ] Commit : `test(memberships): add E2E tests for V2`

---

## Phase 7 : Validation et Déploiement

**Durée estimée : 2 jours**

### Étape 7.1 : Vérification Locale Complète

```bash
# 1. Linter
pnpm lint

# 2. Type check
pnpm typecheck

# 3. Tests unitaires
pnpm test --run

# 4. Build
pnpm build

# 5. Tests E2E
pnpm test:e2e
```

### Étape 7.2 : PR vers `develop`

```bash
git add .
git commit -m "feat(memberships): complete membership-requests V2 module"
git push -u origin refactor/membership-requests-v2
```

Créer la PR sur GitHub :
- Titre : `refactor(memberships): Membership Requests V2 Module`
- Description : Lister toutes les améliorations

### Étape 7.3 : Validation Préprod

1. CI passe
2. Déploiement auto sur préprod
3. Tests E2E en préprod

```bash
# Tests E2E en préprod
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false pnpm test:e2e:preprod
```

### Étape 7.4 : Migration V1 → V2

Une fois validé en préprod :

1. **Modifier la route principale** :
   ```typescript
   // src/app/(admin)/membership-requests/page.tsx
   import { MembershipRequestsPageV2 } from '@/domains/memberships/components/layout/MembershipRequestsPageV2'
   
   export default function MembershipRequestsPage() {
     return <MembershipRequestsPageV2 />
   }
   ```

2. **Supprimer la route V2** (optionnel) :
   ```bash
   rm -rf src/app/(admin)/membership-requests-v2
   ```

3. **Créer un nouveau commit** :
   ```bash
   git commit -m "feat(memberships): migrate to V2 on main route"
   ```

### Étape 7.5 : PR vers `main` (Production)

1. Créer PR `develop` → `main`
2. Review
3. Merge
4. Déploiement auto en production

### Checklist Phase 7

- [ ] Tous les tests locaux passent
- [ ] PR créée vers `develop`
- [ ] CI passe
- [ ] Déploiement préprod OK
- [ ] Tests E2E préprod passent
- [ ] Smoke test manuel OK
- [ ] Migration V1 → V2 effectuée
- [ ] PR créée vers `main`
- [ ] Déploiement production OK

---

## Checklist Globale

### Documentation

- [ ] `ANALYSE_ACTUELLE.md` à jour
- [ ] `CRITIQUE_ARCHITECTURE.md` à jour
- [ ] `WIREFRAME_UI.md` respecté
- [ ] `PLAN_TESTS_TDD.md` suivi
- [ ] Diagrammes UML à jour

### Code

- [ ] Architecture respectée (Repository → Service → Hook → Component)
- [ ] Constantes centralisées (`src/constantes/membership-requests.ts`)
- [ ] Types TypeScript stricts
- [ ] Design System KARA respecté
- [ ] Composants accessibles (ARIA)
- [ ] Responsive (Mobile, Tablet, Desktop)

### Tests

- [ ] Tests unitaires : couverture > 80%
- [ ] Tests d'intégration écrits
- [ ] Tests E2E passent (local)
- [ ] Tests E2E passent (préprod)

### Firebase

- [ ] Règles Firestore déployées
- [ ] Règles Storage déployées
- [ ] Index Firestore construits

### Déploiement

- [ ] Préprod validé
- [ ] Production déployé
- [ ] Monitoring configuré

---

## Commandes Utiles

```bash
# Tests unitaires
pnpm test src/domains/memberships/
pnpm test:coverage

# Tests E2E
pnpm test:e2e e2e/membership-requests-v2/
pnpm test:e2e:ui

# Firebase
firebase use dev
firebase deploy --only firestore:rules,firestore:indexes,storage

# Build
pnpm build

# Dev
pnpm dev
```

---

## Références

- `documentation/WORKFLOW.md` — Workflow générique
- `documentation/membership-requests/` — Documentation complète du module
- `src/constantes/membership-requests.ts` — Constantes centralisées
