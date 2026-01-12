/**
 * Tests unitaires pour les hooks V2 de géographie avec pagination
 * 
 * @see https://vitest.dev/
 * @see https://testing-library.com/react-hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// ================== MOCKS AVANT IMPORT ==================

// Créer les objets mock dans le scope global (avant vi.mock qui est hoisted)
// On les crée comme variables globales pour qu'ils soient accessibles dans les mocks
const createMockRepo = () => ({
  getPaginated: vi.fn(),
  getCount: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
})

// Mock des repositories - créer les instances directement dans les factories
vi.mock('../../repositories/ProvinceRepositoryV2', () => {
  const mockRepo = {
    getPaginated: vi.fn(),
    getCount: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  return {
    ProvinceRepositoryV2: vi.fn().mockImplementation(() => mockRepo),
    __mockRepo: mockRepo, // Exporter pour utilisation dans les tests
  }
})

vi.mock('../../repositories/DepartmentRepositoryV2', () => {
  const mockRepo = {
    getPaginated: vi.fn(),
    getCount: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  return {
    DepartmentRepositoryV2: vi.fn().mockImplementation(() => mockRepo),
    __mockRepo: mockRepo,
  }
})

vi.mock('../../repositories/CommuneRepositoryV2', () => {
  const mockRepo = {
    getPaginated: vi.fn(),
    getCount: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  return {
    CommuneRepositoryV2: vi.fn().mockImplementation(() => mockRepo),
    __mockRepo: mockRepo,
  }
})

vi.mock('../../repositories/DistrictRepositoryV2', () => {
  const mockRepo = {
    getPaginated: vi.fn(),
    getCount: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  return {
    DistrictRepositoryV2: vi.fn().mockImplementation(() => mockRepo),
    __mockRepo: mockRepo,
  }
})

vi.mock('../../repositories/QuarterRepositoryV2', () => {
  const mockRepo = {
    getPaginated: vi.fn(),
    getCount: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  return {
    QuarterRepositoryV2: vi.fn().mockImplementation(() => mockRepo),
    __mockRepo: mockRepo,
  }
})

// Mock de useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-id' },
  }),
}))

// Mock de toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock de ServiceFactory pour createBulk
vi.mock('@/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getGeographieService: vi.fn(() => ({
      createDistrictsBulk: vi.fn(),
    })),
  },
}))

// Maintenant importer les hooks (après les mocks)
import {
  useProvincesV2,
  useProvinceMutationsV2,
  useDepartmentsV2,
  useDepartmentMutationsV2,
  useCommunesV2,
  useCommuneMutationsV2,
  useDistrictsV2,
  useDistrictMutationsV2,
  useQuartersV2,
  useQuarterMutationsV2,
  useGeographyStatsV2,
} from '../../hooks/useGeographieV2'

// Récupérer les mocks depuis les modules mockés
import * as ProvinceRepoModule from '../../repositories/ProvinceRepositoryV2'
import * as DepartmentRepoModule from '../../repositories/DepartmentRepositoryV2'
import * as CommuneRepoModule from '../../repositories/CommuneRepositoryV2'
import * as DistrictRepoModule from '../../repositories/DistrictRepositoryV2'
import * as QuarterRepoModule from '../../repositories/QuarterRepositoryV2'

// Accéder aux mocks via les modules
const mockProvinceRepo = (ProvinceRepoModule as any).__mockRepo || {
  getPaginated: vi.fn(),
  getCount: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

const mockDepartmentRepo = (DepartmentRepoModule as any).__mockRepo || {
  getPaginated: vi.fn(),
  getCount: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

const mockCommuneRepo = (CommuneRepoModule as any).__mockRepo || {
  getPaginated: vi.fn(),
  getCount: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

const mockDistrictRepo = (DistrictRepoModule as any).__mockRepo || {
  getPaginated: vi.fn(),
  getCount: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

const mockQuarterRepo = (QuarterRepoModule as any).__mockRepo || {
  getPaginated: vi.fn(),
  getCount: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

// ================== TESTS ==================

describe('useProvincesV2 - Pagination', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    })

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    // Réinitialiser les mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('devrait charger la première page avec pagination', async () => {
    const mockProvinces = [
      {
        id: '1',
        name: 'Estuaire',
        code: 'EST',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
      },
      {
        id: '2',
        name: 'Haut-Ogooué',
        code: 'HOG',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
      },
    ]

    mockProvinceRepo.getPaginated = vi.fn().mockResolvedValue({
      data: mockProvinces,
      pagination: {
        nextCursor: '2',
        prevCursor: null,
        hasNextPage: true,
        hasPrevPage: false,
        pageSize: 20,
      },
    })

    mockProvinceRepo.getCount = vi.fn().mockResolvedValue(50)

    const { result } = renderHook(() => useProvincesV2({ pageSize: 20 }), { wrapper })

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(result.current.data).toEqual(mockProvinces)
    expect(result.current.hasNextPage).toBe(true)
    expect(result.current.totalCount).toBe(50)
    expect(mockProvinceRepo.getPaginated).toHaveBeenCalledWith({
      pageSize: 20,
      cursor: undefined,
      search: undefined,
    })
  })

  it('devrait charger la page suivante avec fetchNextPage', async () => {
    const page1 = [
      {
        id: '1',
        name: 'Estuaire',
        code: 'EST',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
      },
    ]
    const page2 = [
      {
        id: '2',
        name: 'Haut-Ogooué',
        code: 'HOG',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
      },
    ]

    mockProvinceRepo.getPaginated = vi
      .fn()
      .mockResolvedValueOnce({
        data: page1,
        pagination: {
          nextCursor: '1',
          prevCursor: null,
          hasNextPage: true,
          hasPrevPage: false,
          pageSize: 20,
        },
      })
      .mockResolvedValueOnce({
        data: page2,
        pagination: {
          nextCursor: null,
          prevCursor: '1',
          hasNextPage: false,
          hasPrevPage: true,
          pageSize: 20,
        },
      })

    mockProvinceRepo.getCount = vi.fn().mockResolvedValue(2)

    const { result } = renderHook(() => useProvincesV2({ pageSize: 20 }), { wrapper })

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(result.current.data).toEqual(page1)
    expect(result.current.hasNextPage).toBe(true)

    // Charger la page suivante
    await result.current.fetchNextPage()

    await waitFor(
      () => {
        expect(result.current.isFetchingNextPage).toBe(false)
      },
      { timeout: 3000 }
    )

    // Les données doivent être concaténées
    expect(result.current.data.length).toBe(2)
    expect(result.current.hasNextPage).toBe(false)
  })

  it('devrait rechercher avec debounce', async () => {
    const mockProvinces = [
      {
        id: '1',
        name: 'Estuaire',
        code: 'EST',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
      },
    ]

    mockProvinceRepo.getPaginated = vi.fn().mockResolvedValue({
      data: mockProvinces,
      pagination: {
        nextCursor: null,
        prevCursor: null,
        hasNextPage: false,
        hasPrevPage: false,
        pageSize: 20,
      },
    })

    mockProvinceRepo.getCount = vi.fn().mockResolvedValue(1)

    const { result, rerender } = renderHook(
      ({ search }) => useProvincesV2({ search, pageSize: 20 }),
      {
        wrapper,
        initialProps: { search: '' },
      }
    )

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    // Changer la recherche
    rerender({ search: 'Estuaire' })

    // Attendre le debounce (300ms) + chargement
    await waitFor(
      () => {
        expect(mockProvinceRepo.getPaginated).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Estuaire',
          })
        )
      },
      { timeout: 1000 }
    )
  })
})

describe('useProvinceMutationsV2', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('devrait créer une province', async () => {
    const mockProvince = {
      id: 'new-id',
      name: 'Nouvelle Province',
      code: 'NP',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user-id',
    }

    mockProvinceRepo.create = vi.fn().mockResolvedValue(mockProvince)

    const { result } = renderHook(() => useProvinceMutationsV2(), { wrapper })

    await result.current.create.mutateAsync({
      name: 'Nouvelle Province',
      code: 'NP',
    })

    await waitFor(
      () => {
        expect(result.current.create.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(mockProvinceRepo.create).toHaveBeenCalledWith({
      name: 'Nouvelle Province',
      code: 'NP',
      createdBy: 'test-user-id',
    })
  })

  it('devrait mettre à jour une province', async () => {
    const mockProvince = {
      id: '1',
      name: 'Province Modifiée',
      code: 'PM',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user-id',
      updatedBy: 'test-user-id',
    }

    mockProvinceRepo.update = vi.fn().mockResolvedValue(mockProvince)

    const { result } = renderHook(() => useProvinceMutationsV2(), { wrapper })

    await result.current.update.mutateAsync({
      id: '1',
      data: { name: 'Province Modifiée' },
    })

    await waitFor(
      () => {
        expect(result.current.update.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(mockProvinceRepo.update).toHaveBeenCalledWith('1', {
      name: 'Province Modifiée',
      updatedBy: 'test-user-id',
    })
  })

  it('devrait supprimer une province', async () => {
    mockProvinceRepo.delete = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() => useProvinceMutationsV2(), { wrapper })

    await result.current.remove.mutateAsync('1')

    await waitFor(
      () => {
        expect(result.current.remove.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(mockProvinceRepo.delete).toHaveBeenCalledWith('1')
  })

  it('devrait gérer les erreurs lors de la création', async () => {
    mockProvinceRepo.create = vi.fn().mockRejectedValue(new Error('Erreur de création'))

    const { result } = renderHook(() => useProvinceMutationsV2(), { wrapper })

    result.current.create.mutate({
      name: 'Nouvelle Province',
      code: 'NP',
    })

    await waitFor(
      () => {
        expect(result.current.create.isError).toBe(true)
      },
      { timeout: 3000 }
    )
  })

  it('devrait gérer les erreurs lors de la mise à jour', async () => {
    mockProvinceRepo.update = vi.fn().mockRejectedValue(new Error('Erreur de mise à jour'))

    const { result } = renderHook(() => useProvinceMutationsV2(), { wrapper })

    result.current.update.mutate({
      id: '1',
      data: { name: 'Province Modifiée' },
    })

    await waitFor(
      () => {
        expect(result.current.update.isError).toBe(true)
      },
      { timeout: 3000 }
    )
  })

  it('devrait gérer les erreurs lors de la suppression', async () => {
    mockProvinceRepo.delete = vi.fn().mockRejectedValue(new Error('Erreur de suppression'))

    const { result } = renderHook(() => useProvinceMutationsV2(), { wrapper })

    result.current.remove.mutate('1')

    await waitFor(
      () => {
        expect(result.current.remove.isError).toBe(true)
      },
      { timeout: 3000 }
    )
  })
})

describe('useDepartmentsV2 - Filtrage par parent', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('devrait filtrer par provinceId', async () => {
    const mockDepartments = [
      {
        id: '1',
        name: 'Libreville',
        provinceId: 'province-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
      },
    ]

    mockDepartmentRepo.getPaginated = vi.fn().mockResolvedValue({
      data: mockDepartments,
      pagination: {
        nextCursor: null,
        prevCursor: null,
        hasNextPage: false,
        hasPrevPage: false,
        pageSize: 20,
      },
    })

    mockDepartmentRepo.getCount = vi.fn().mockResolvedValue(1)

    const { result } = renderHook(
      () => useDepartmentsV2({ parentId: 'province-1', pageSize: 20 }),
      { wrapper }
    )

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(mockDepartmentRepo.getPaginated).toHaveBeenCalledWith({
      parentId: 'province-1',
      pageSize: 20,
      cursor: undefined,
      search: undefined,
    })

    expect(result.current.data).toEqual(mockDepartments)
  })
})

describe('useGeographyStatsV2', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    // Configurer les mocks pour getCount
    mockProvinceRepo.getCount = vi.fn().mockResolvedValue(9)
    mockDepartmentRepo.getCount = vi.fn().mockResolvedValue(50)
    mockCommuneRepo.getCount = vi.fn().mockResolvedValue(100)
    mockDistrictRepo.getCount = vi.fn().mockResolvedValue(200)
    mockQuarterRepo.getCount = vi.fn().mockResolvedValue(500)
  })

  afterEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('devrait récupérer les statistiques avec cache', async () => {
    const { result } = renderHook(() => useGeographyStatsV2(), { wrapper })

    await waitFor(
      () => {
        expect(result.current.provincesCount).toBe(9)
      },
      { timeout: 3000 }
    )

    expect(result.current.provincesCount).toBe(9)
    expect(result.current.departmentsCount).toBe(50)
    expect(result.current.communesCount).toBe(100)
    expect(result.current.districtsCount).toBe(200)
    expect(result.current.quartersCount).toBe(500)

    // Vérifier que getCount est appelé
    expect(mockProvinceRepo.getCount).toHaveBeenCalled()
    expect(mockDepartmentRepo.getCount).toHaveBeenCalled()
    expect(mockCommuneRepo.getCount).toHaveBeenCalled()
    expect(mockDistrictRepo.getCount).toHaveBeenCalled()
    expect(mockQuarterRepo.getCount).toHaveBeenCalled()
  })
})

// ================== TESTS COMMUNES ==================

describe('useCommunesV2 - Pagination', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('devrait récupérer les communes avec pagination', async () => {
    const mockCommunes = [
      {
        id: '1',
        name: 'Libreville',
        departmentId: 'dept-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
      },
    ]

    mockCommuneRepo.getPaginated = vi.fn().mockResolvedValue({
      data: mockCommunes,
      pagination: {
        nextCursor: null,
        prevCursor: null,
        hasNextPage: false,
        hasPrevPage: false,
        pageSize: 20,
      },
    })

    mockCommuneRepo.getCount = vi.fn().mockResolvedValue(1)

    const { result } = renderHook(() => useCommunesV2({ pageSize: 20 }), { wrapper })

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(result.current.data).toEqual(mockCommunes)
    expect(result.current.totalCount).toBe(1)
  })

  it('devrait rechercher des communes', async () => {
    mockCommuneRepo.getPaginated = vi.fn().mockResolvedValue({
      data: [],
      pagination: {
        nextCursor: null,
        prevCursor: null,
        hasNextPage: false,
        hasPrevPage: false,
        pageSize: 20,
      },
    })

    mockCommuneRepo.getCount = vi.fn().mockResolvedValue(0)

    const { result } = renderHook(() => useCommunesV2({ search: 'Libreville' }), { wrapper })

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(mockCommuneRepo.getPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'Libreville',
      })
    )
  })
})

describe('useCommuneMutationsV2', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('devrait créer une commune', async () => {
    const mockCommune = {
      id: 'new-id',
      name: 'Libreville',
      departmentId: 'dept-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user-id',
    }

    mockCommuneRepo.create = vi.fn().mockResolvedValue(mockCommune)

    const { result } = renderHook(() => useCommuneMutationsV2(), { wrapper })

    await result.current.create.mutateAsync({
      name: 'Libreville',
      departmentId: 'dept-1',
    })

    await waitFor(
      () => {
        expect(result.current.create.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(mockCommuneRepo.create).toHaveBeenCalled()
  })

  it('devrait mettre à jour une commune', async () => {
    const mockCommune = {
      id: '1',
      name: 'Libreville Modifiée',
      departmentId: 'dept-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user-id',
    }

    mockCommuneRepo.update = vi.fn().mockResolvedValue(mockCommune)

    const { result } = renderHook(() => useCommuneMutationsV2(), { wrapper })

    await result.current.update.mutateAsync({
      id: '1',
      data: { name: 'Libreville Modifiée' },
    })

    await waitFor(
      () => {
        expect(result.current.update.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(mockCommuneRepo.update).toHaveBeenCalled()
  })

  it('devrait supprimer une commune', async () => {
    mockCommuneRepo.delete = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() => useCommuneMutationsV2(), { wrapper })

    await result.current.remove.mutateAsync('1')

    await waitFor(
      () => {
        expect(result.current.remove.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(mockCommuneRepo.delete).toHaveBeenCalledWith('1')
  })
})

// ================== TESTS DISTRICTS ==================

describe('useDistrictsV2 - Pagination', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('devrait récupérer les arrondissements avec pagination', async () => {
    const mockDistricts = [
      {
        id: '1',
        name: 'Centre-Ville',
        communeId: 'commune-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
      },
    ]

    mockDistrictRepo.getPaginated = vi.fn().mockResolvedValue({
      data: mockDistricts,
      pagination: {
        nextCursor: null,
        prevCursor: null,
        hasNextPage: false,
        hasPrevPage: false,
        pageSize: 20,
      },
    })

    mockDistrictRepo.getCount = vi.fn().mockResolvedValue(1)

    const { result } = renderHook(() => useDistrictsV2({ pageSize: 20 }), { wrapper })

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(result.current.data).toEqual(mockDistricts)
    expect(result.current.totalCount).toBe(1)
  })
})

describe('useDistrictMutationsV2', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('devrait créer un arrondissement', async () => {
    const mockDistrict = {
      id: 'new-id',
      name: 'Centre-Ville',
      communeId: 'commune-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user-id',
    }

    mockDistrictRepo.create = vi.fn().mockResolvedValue(mockDistrict)

    const { result } = renderHook(() => useDistrictMutationsV2(), { wrapper })

    await result.current.create.mutateAsync({
      name: 'Centre-Ville',
      communeId: 'commune-1',
    })

    await waitFor(
      () => {
        expect(result.current.create.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(mockDistrictRepo.create).toHaveBeenCalled()
  })

  it('devrait mettre à jour un arrondissement', async () => {
    const mockDistrict = {
      id: '1',
      name: 'Centre-Ville Modifié',
      communeId: 'commune-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user-id',
    }

    mockDistrictRepo.update = vi.fn().mockResolvedValue(mockDistrict)

    const { result } = renderHook(() => useDistrictMutationsV2(), { wrapper })

    await result.current.update.mutateAsync({
      id: '1',
      data: { name: 'Centre-Ville Modifié' },
    })

    await waitFor(
      () => {
        expect(result.current.update.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(mockDistrictRepo.update).toHaveBeenCalled()
  })

  it('devrait supprimer un arrondissement', async () => {
    mockDistrictRepo.delete = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() => useDistrictMutationsV2(), { wrapper })

    await result.current.remove.mutateAsync('1')

    await waitFor(
      () => {
        expect(result.current.remove.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(mockDistrictRepo.delete).toHaveBeenCalledWith('1')
  })
})

// ================== TESTS QUARTERS ==================

describe('useQuartersV2 - Pagination', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('devrait récupérer les quartiers avec pagination', async () => {
    const mockQuarters = [
      {
        id: '1',
        name: 'Quartier A',
        districtId: 'district-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
      },
    ]

    mockQuarterRepo.getPaginated = vi.fn().mockResolvedValue({
      data: mockQuarters,
      pagination: {
        nextCursor: null,
        prevCursor: null,
        hasNextPage: false,
        hasPrevPage: false,
        pageSize: 20,
      },
    })

    mockQuarterRepo.getCount = vi.fn().mockResolvedValue(1)

    const { result } = renderHook(() => useQuartersV2({ pageSize: 20 }), { wrapper })

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(result.current.data).toEqual(mockQuarters)
    expect(result.current.totalCount).toBe(1)
  })
})

describe('useQuarterMutationsV2', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('devrait créer un quartier', async () => {
    const mockQuarter = {
      id: 'new-id',
      name: 'Quartier A',
      districtId: 'district-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user-id',
    }

    mockQuarterRepo.create = vi.fn().mockResolvedValue(mockQuarter)

    const { result } = renderHook(() => useQuarterMutationsV2(), { wrapper })

    await result.current.create.mutateAsync({
      name: 'Quartier A',
      districtId: 'district-1',
    })

    await waitFor(
      () => {
        expect(result.current.create.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(mockQuarterRepo.create).toHaveBeenCalled()
  })

  it('devrait mettre à jour un quartier', async () => {
    const mockQuarter = {
      id: '1',
      name: 'Quartier A Modifié',
      districtId: 'district-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user-id',
    }

    mockQuarterRepo.update = vi.fn().mockResolvedValue(mockQuarter)

    const { result } = renderHook(() => useQuarterMutationsV2(), { wrapper })

    await result.current.update.mutateAsync({
      id: '1',
      data: { name: 'Quartier A Modifié' },
    })

    await waitFor(
      () => {
        expect(result.current.update.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(mockQuarterRepo.update).toHaveBeenCalled()
  })

  it('devrait supprimer un quartier', async () => {
    mockQuarterRepo.delete = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() => useQuarterMutationsV2(), { wrapper })

    await result.current.remove.mutateAsync('1')

    await waitFor(
      () => {
        expect(result.current.remove.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(mockQuarterRepo.delete).toHaveBeenCalledWith('1')
  })
})

describe('useDepartmentMutationsV2', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('devrait créer un département', async () => {
    const mockDepartment = {
      id: 'new-id',
      name: 'Libreville',
      provinceId: 'province-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user-id',
    }

    mockDepartmentRepo.create = vi.fn().mockResolvedValue(mockDepartment)

    const { result } = renderHook(() => useDepartmentMutationsV2(), { wrapper })

    await result.current.create.mutateAsync({
      name: 'Libreville',
      provinceId: 'province-1',
    })

    await waitFor(
      () => {
        expect(result.current.create.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(mockDepartmentRepo.create).toHaveBeenCalled()
  })

  it('devrait mettre à jour un département', async () => {
    const mockDepartment = {
      id: '1',
      name: 'Libreville Modifié',
      provinceId: 'province-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user-id',
    }

    mockDepartmentRepo.update = vi.fn().mockResolvedValue(mockDepartment)

    const { result } = renderHook(() => useDepartmentMutationsV2(), { wrapper })

    await result.current.update.mutateAsync({
      id: '1',
      data: { name: 'Libreville Modifié' },
    })

    await waitFor(
      () => {
        expect(result.current.update.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(mockDepartmentRepo.update).toHaveBeenCalled()
  })

  it('devrait supprimer un département', async () => {
    mockDepartmentRepo.delete = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() => useDepartmentMutationsV2(), { wrapper })

    await result.current.remove.mutateAsync('1')

    await waitFor(
      () => {
        expect(result.current.remove.isSuccess).toBe(true)
      },
      { timeout: 3000 }
    )

    expect(mockDepartmentRepo.delete).toHaveBeenCalledWith('1')
  })
})
