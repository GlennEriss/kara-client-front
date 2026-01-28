# Mocks - Module Demandes Caisse Imprévue V2

> Mocks et stubs nécessaires pour les tests unitaires et d'intégration

## 📋 Vue d'ensemble

**Objectif** : Centraliser tous les mocks et stubs pour isoler les dépendances externes dans les tests

**Framework** : Vitest (`vi.mock`, `vi.fn`)  
**Structure** : `src/domains/financial/caisse-imprevue/__tests__/mocks/`

---

## 🎯 Types de Mocks

1. **Repositories** : Mock Firestore queries
2. **Services** : Mock NotificationService, ContractService
3. **Hooks** : Mock React Query
4. **Utils** : Mock localStorage, Date
5. **Firebase** : Mock Firestore, Storage

---

## 📁 Structure des Fichiers

```
__tests__/mocks/
├── firestore.ts            # Mocks Firestore
├── notifications.ts        # Mocks NotificationService
├── contracts.ts            # Mocks ContractService
├── localStorage.ts          # Mocks localStorage
├── date.ts                 # Mocks Date
└── index.ts                 # Export centralisé
```

---

## 🧪 1. Mocks Firestore (`firestore.ts`)

### 1.1 Mock Collection et Document

```typescript
import { vi } from 'vitest'
import { Timestamp } from 'firebase/firestore'

export function createMockFirestoreDoc(data: any) {
  return {
    id: data.id || 'test-id',
    data: () => ({
      ...data,
      createdAt: data.createdAt instanceof Date 
        ? Timestamp.fromDate(data.createdAt) 
        : data.createdAt,
      updatedAt: data.updatedAt instanceof Date 
        ? Timestamp.fromDate(data.updatedAt) 
        : data.updatedAt
    }),
    exists: () => true,
    ref: {
      id: data.id || 'test-id',
      path: `caisseImprevueDemands/${data.id || 'test-id'}`
    }
  }
}

export function createMockFirestoreQuerySnapshot(docs: any[]) {
  return {
    docs: docs.map(createMockFirestoreDoc),
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback: (doc: any) => void) => {
      docs.forEach(doc => callback(createMockFirestoreDoc(doc)))
    }
  }
}

export function createMockFirestore() {
  const mockCollection = vi.fn()
  const mockDoc = vi.fn()
  const mockAdd = vi.fn()
  const mockSet = vi.fn()
  const mockUpdate = vi.fn()
  const mockDelete = vi.fn()
  const mockGet = vi.fn()
  const mockGetDocs = vi.fn()
  const mockGetCountFromServer = vi.fn()
  const mockQuery = vi.fn()
  const mockWhere = vi.fn()
  const mockOrderBy = vi.fn()
  const mockLimit = vi.fn()
  const mockStartAfter = vi.fn()
  
  return {
    collection: mockCollection,
    doc: mockDoc,
    add: mockAdd,
    setDoc: mockSet,
    updateDoc: mockUpdate,
    deleteDoc: mockDelete,
    getDoc: mockGet,
    getDocs: mockGetDocs,
    getCountFromServer: mockGetCountFromServer,
    query: mockQuery,
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    startAfter: mockStartAfter
  }
}
```

### 1.2 Mock DemandCIRepository

```typescript
import { vi } from 'vitest'
import { DemandCIRepository } from '@/domains/financial/caisse-imprevue/repositories/DemandCIRepository'

export function createMockDemandCIRepository() {
  const mockCreate = vi.fn()
  const mockGetById = vi.fn()
  const mockGetPaginated = vi.fn()
  const mockSearch = vi.fn()
  const mockUpdate = vi.fn()
  const mockDelete = vi.fn()
  
  const repository = {
    create: mockCreate,
    getById: mockGetById,
    getPaginated: mockGetPaginated,
    search: mockSearch,
    update: mockUpdate,
    delete: mockDelete
  } as unknown as DemandCIRepository
  
  return {
    repository,
    mocks: {
      create: mockCreate,
      getById: mockGetById,
      getPaginated: mockGetPaginated,
      search: mockSearch,
      update: mockUpdate,
      delete: mockDelete
    }
  }
}
```

### 1.3 Mock SubscriptionCIRepository

```typescript
import { vi } from 'vitest'
import { SubscriptionCIRepository } from '@/domains/financial/caisse-imprevue/repositories/SubscriptionCIRepository'

export function createMockSubscriptionCIRepository() {
  const mockGetAll = vi.fn()
  const mockGetById = vi.fn()
  const mockGetActive = vi.fn()
  
  const repository = {
    getAll: mockGetAll,
    getById: mockGetById,
    getActive: mockGetActive
  } as unknown as SubscriptionCIRepository
  
  return {
    repository,
    mocks: {
      getAll: mockGetAll,
      getById: mockGetById,
      getActive: mockGetActive
    }
  }
}
```

---

## 🧪 2. Mocks Notifications (`notifications.ts`)

### 2.1 Mock NotificationService

```typescript
import { vi } from 'vitest'

export function createMockNotificationService() {
  const mockCreateNotification = vi.fn()
  const mockGetNotifications = vi.fn()
  const mockMarkAsRead = vi.fn()
  const mockDeleteNotification = vi.fn()
  
  return {
    createNotification: mockCreateNotification,
    getNotifications: mockGetNotifications,
    markAsRead: mockMarkAsRead,
    deleteNotification: mockDeleteNotification,
    mocks: {
      createNotification: mockCreateNotification,
      getNotifications: mockGetNotifications,
      markAsRead: mockMarkAsRead,
      deleteNotification: mockDeleteNotification
    }
  }
}

// Mock global pour les tests
export const mockNotificationService = createMockNotificationService()

vi.mock('@/services/notifications/NotificationService', () => ({
  NotificationService: {
    getInstance: () => mockNotificationService
  }
}))
```

---

## 🧪 3. Mocks Contrats (`contracts.ts`)

### 3.1 Mock ContractService

```typescript
import { vi } from 'vitest'

export function createMockContractService() {
  const mockCreateContract = vi.fn()
  const mockGetContractById = vi.fn()
  const mockUpdateContract = vi.fn()
  
  return {
    createContract: mockCreateContract,
    getContractById: mockGetContractById,
    updateContract: mockUpdateContract,
    mocks: {
      createContract: mockCreateContract,
      getContractById: mockGetContractById,
      updateContract: mockUpdateContract
    }
  }
}

// Mock global pour les tests
export const mockContractService = createMockContractService()

vi.mock('@/services/contracts/ContractService', () => ({
  ContractService: {
    getInstance: () => mockContractService
  }
}))
```

---

## 🧪 4. Mocks localStorage (`localStorage.ts`)

### 4.1 Mock localStorage

```typescript
import { vi } from 'vitest'

export function createMockLocalStorage() {
  const store: Record<string, string> = {}
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }),
    // Helper pour réinitialiser
    reset: () => {
      Object.keys(store).forEach(key => delete store[key])
    },
    // Helper pour vérifier le contenu
    getStore: () => ({ ...store })
  }
}

// Utilisation dans les tests
export function setupLocalStorageMock() {
  const mockStorage = createMockLocalStorage()
  
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true
  })
  
  return mockStorage
}
```

---

## 🧪 5. Mocks Date (`date.ts`)

### 5.1 Mock Date

```typescript
import { vi } from 'vitest'

export function createMockDate(fixedDate: Date = new Date('2024-01-15T10:00:00Z')) {
  const mockDate = vi.fn(() => fixedDate)
  mockDate.now = vi.fn(() => fixedDate.getTime())
  mockDate.parse = Date.parse
  mockDate.UTC = Date.UTC
  
  return mockDate
}

// Utilisation dans les tests
export function setupDateMock(fixedDate?: Date) {
  const mockDate = createMockDate(fixedDate)
  global.Date = mockDate as any
  
  return {
    restore: () => {
      global.Date = Date
    },
    setDate: (newDate: Date) => {
      mockDate.mockReturnValue(newDate)
      mockDate.now.mockReturnValue(newDate.getTime())
    }
  }
}
```

---

## 🧪 6. Mocks React Query (`react-query.ts`)

### 6.1 Mock QueryClient

```typescript
import { vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

export function createMockQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0
      }
    }
  })
  
  return queryClient
}

// Helper pour wrapper les composants dans les tests
export function createQueryWrapper() {
  const queryClient = createMockQueryClient()
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

---

## 🧪 7. Mocks Firebase Storage (`storage.ts`)

### 7.1 Mock Storage

```typescript
import { vi } from 'vitest'

export function createMockStorage() {
  const mockRef = vi.fn()
  const mockUploadBytes = vi.fn()
  const mockGetDownloadURL = vi.fn()
  const mockDeleteObject = vi.fn()
  
  return {
    ref: mockRef,
    uploadBytes: mockUploadBytes,
    getDownloadURL: mockGetDownloadURL,
    deleteObject: mockDeleteObject,
    mocks: {
      ref: mockRef,
      uploadBytes: mockUploadBytes,
      getDownloadURL: mockGetDownloadURL,
      deleteObject: mockDeleteObject
    }
  }
}

// Mock global pour les tests
export const mockStorage = createMockStorage()

vi.mock('firebase/storage', () => ({
  getStorage: () => mockStorage,
  ref: mockStorage.ref,
  uploadBytes: mockStorage.uploadBytes,
  getDownloadURL: mockStorage.getDownloadURL,
  deleteObject: mockStorage.deleteObject
}))
```

---

## 🧪 8. Mocks Utilitaires (`utils.ts`)

### 8.1 Mock Toast

```typescript
import { vi } from 'vitest'

export function createMockToast() {
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }
  
  return mockToast
}

vi.mock('@/components/ui/toast', () => ({
  toast: createMockToast()
}))
```

### 8.2 Mock Router (Next.js)

```typescript
import { vi } from 'vitest'

export function createMockRouter() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/'
  }
}

vi.mock('next/navigation', () => ({
  useRouter: () => createMockRouter(),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams()
}))
```

---

## 📊 Export Centralisé (`index.ts`)

```typescript
// Firestore
export * from './firestore'

// Notifications
export * from './notifications'

// Contracts
export * from './contracts'

// localStorage
export * from './localStorage'

// Date
export * from './date'

// React Query
export * from './react-query'

// Storage
export * from './storage'

// Utils
export * from './utils'
```

---

## ✅ Checklist d'Implémentation

- [ ] Créer le dossier `__tests__/mocks/`
- [ ] Implémenter `firestore.ts` avec tous les mocks Firestore
- [ ] Implémenter `notifications.ts` avec le mock NotificationService
- [ ] Implémenter `contracts.ts` avec le mock ContractService
- [ ] Implémenter `localStorage.ts` avec le mock localStorage
- [ ] Implémenter `date.ts` avec le mock Date
- [ ] Implémenter `react-query.ts` avec le mock QueryClient
- [ ] Implémenter `storage.ts` avec le mock Storage
- [ ] Implémenter `utils.ts` avec les mocks utilitaires
- [ ] Créer `index.ts` pour les exports
- [ ] Documenter l'utilisation dans les tests
- [ ] Vérifier que tous les mocks sont utilisés

---

## 📚 Utilisation dans les Tests

### Exemple : Test Unitaire avec Mocks

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDemandCIRepository } from '@/__tests__/mocks'
import { CaisseImprevueService } from '@/domains/financial/caisse-imprevue/services/CaisseImprevueService'

describe('CaisseImprevueService', () => {
  let mockRepository: ReturnType<typeof createMockDemandCIRepository>
  
  beforeEach(() => {
    mockRepository = createMockDemandCIRepository()
    // Injecter le mock dans le service
  })
  
  it('should create demand', async () => {
    // Arrange
    const demandData = createDemandFixture()
    mockRepository.mocks.create.mockResolvedValue(demandData)
    
    // Act
    const result = await service.createDemand(demandData, 'admin-1')
    
    // Assert
    expect(result).toBeDefined()
    expect(mockRepository.mocks.create).toHaveBeenCalledWith(demandData)
  })
})
```

### Exemple : Test avec Mock localStorage

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setupLocalStorageMock } from '@/__tests__/mocks'

describe('useDemandFormPersistence', () => {
  let mockStorage: ReturnType<typeof setupLocalStorageMock>
  
  beforeEach(() => {
    mockStorage = setupLocalStorageMock()
  })
  
  it('should save to localStorage', () => {
    // Arrange
    const formData = { memberId: 'member-1', cause: 'Test' }
    
    // Act
    saveFormData(formData)
    
    // Assert
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'demand-form-state',
      expect.stringContaining('member-1')
    )
  })
})
```

### Exemple : Test avec Mock Date

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setupDateMock } from '@/__tests__/mocks'

describe('DemandCIRepository', () => {
  let dateMock: ReturnType<typeof setupDateMock>
  
  beforeEach(() => {
    dateMock = setupDateMock(new Date('2024-01-15T10:00:00Z'))
  })
  
  afterEach(() => {
    dateMock.restore()
  })
  
  it('should set createdAt timestamp', async () => {
    // Arrange
    const demandData = createDemandFixture()
    
    // Act
    const result = await repository.create(demandData)
    
    // Assert
    expect(result.createdAt).toEqual(new Date('2024-01-15T10:00:00Z'))
  })
})
```

---

**Date de création** : 2026-01-27  
**Version** : V2  
**Auteur** : Senior QA
