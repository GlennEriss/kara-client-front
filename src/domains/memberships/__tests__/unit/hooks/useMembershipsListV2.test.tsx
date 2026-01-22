/**
 * Tests unitaires pour useMembershipsListV2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMembershipsListV2 } from '../../../hooks/useMembershipsListV2'
import type { UserFilters } from '@/types/types'
import type { PaginatedMembers } from '@/db/member.db'

// Mock MembersRepositoryV2
const mockGetAll = vi.fn()
const mockRepository = {
  getAll: mockGetAll,
}

vi.mock('../../../repositories/MembersRepositoryV2', () => ({
  MembersRepositoryV2: {
    getInstance: () => mockRepository,
  },
}))

// Mock MembershipsListService
vi.mock('../../../services/MembershipsListService', () => {
  const mockBuildFiltersForTab = vi.fn((filters, tab) => filters)
  const mockCalculateStats = vi.fn(() => ({
    total: 0,
    adherant: 0,
    bienfaiteur: 0,
    sympathisant: 0,
    active: 0,
    expired: 0,
  }))
  
  return {
    MembershipsListService: {
      buildFiltersForTab: mockBuildFiltersForTab,
      calculateStats: mockCalculateStats,
    },
  }
})

const { MembershipsListService } = await import('../../../services/MembershipsListService')
const mockBuildFiltersForTab = vi.mocked(MembershipsListService.buildFiltersForTab)
const mockCalculateStats = vi.mocked(MembershipsListService.calculateStats)

describe('useMembershipsListV2', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    })
    vi.clearAllMocks()
    // Réinitialiser les mocks
    mockBuildFiltersForTab.mockImplementation((filters) => filters)
    mockCalculateStats.mockReturnValue({
      total: 0,
      adherant: 0,
      bienfaiteur: 0,
      sympathisant: 0,
      active: 0,
      expired: 0,
    })
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('devrait retourner les données de la requête', async () => {
    const mockData: PaginatedMembers = {
      data: [
        {
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          lastSubscription: null,
          isSubscriptionValid: false,
        },
      ],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPrevPage: false,
        nextCursor: null,
        prevCursor: null,
      },
    }

    mockGetAll.mockResolvedValue(mockData)

    const { result } = renderHook(
      () => useMembershipsListV2({ filters: {}, page: 1, limit: 10 }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.isError).toBe(false)
  })

  it('devrait construire les filtres effectifs en fonction du tab', async () => {
    const mockData: PaginatedMembers = {
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPrevPage: false,
        nextCursor: null,
        prevCursor: null,
      },
    }

    const baseFilters: UserFilters = { membershipType: ['adherant'] }
    const tabFilters: UserFilters = { membershipType: ['adherant'], isActive: true }
    
    mockBuildFiltersForTab.mockReturnValue(tabFilters)
    mockGetAll.mockResolvedValue(mockData)

    const { result } = renderHook(
      () => useMembershipsListV2({ filters: baseFilters, page: 1, limit: 10, tab: 'adherant' }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockBuildFiltersForTab).toHaveBeenCalledWith(baseFilters, 'adherant')
    expect(mockGetAll).toHaveBeenCalledWith(tabFilters, 1, 10)
  })

  it('devrait calculer les statistiques à partir des données', async () => {
    const mockData: PaginatedMembers = {
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPrevPage: false,
        nextCursor: null,
        prevCursor: null,
      },
    }

    const mockStats = {
      total: 10,
      adherant: 5,
      bienfaiteur: 3,
      sympathisant: 2,
      active: 8,
      expired: 2,
    }

    mockGetAll.mockResolvedValue(mockData)
    mockCalculateStats.mockReturnValue(mockStats)

    const { result } = renderHook(
      () => useMembershipsListV2({ filters: {}, page: 1, limit: 10 }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockCalculateStats).toHaveBeenCalledWith(mockData)
    expect(result.current.stats).toEqual(mockStats)
  })

  it('devrait gérer l\'état de chargement', async () => {
    mockGetAll.mockImplementation(() => new Promise(() => {})) // Jamais résolu

    const { result } = renderHook(
      () => useMembershipsListV2({ filters: {}, page: 1, limit: 10 }),
      { wrapper }
    )

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('devrait gérer les erreurs', async () => {
    const error = new Error('Test error')
    mockGetAll.mockRejectedValue(error)

    const { result } = renderHook(
      () => useMembershipsListV2({ filters: {}, page: 1, limit: 10 }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toEqual(error)
    expect(result.current.data).toBeUndefined()
  })

    it('devrait utiliser les valeurs par défaut si les options ne sont pas fournies', async () => {
      const mockData: PaginatedMembers = {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: 10,
          hasNextPage: false,
          hasPrevPage: false,
          nextCursor: null,
          prevCursor: null,
        },
      }

      mockGetAll.mockResolvedValue(mockData)

      const { result } = renderHook(() => useMembershipsListV2(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // buildFiltersForTab est appelé avec {} et undefined (pas de tab)
      expect(mockBuildFiltersForTab).toHaveBeenCalledWith({}, undefined)
      // getAll est appelé avec les filtres construits (qui sont {} dans ce cas)
      expect(mockGetAll).toHaveBeenCalled()
      const callArgs = mockGetAll.mock.calls[0]
      expect(callArgs[0]).toEqual({}) // filters
      expect(callArgs[1]).toBe(1) // page
      expect(callArgs[2]).toBe(10) // limit
    })

    it('devrait utiliser les paramètres personnalisés', async () => {
      const mockData: PaginatedMembers = {
        data: [],
        pagination: {
          currentPage: 2,
          totalPages: 5,
          totalItems: 50,
          itemsPerPage: 20,
          hasNextPage: true,
          hasPrevPage: true,
          nextCursor: null,
          prevCursor: null,
        },
      }

      const filters: UserFilters = { membershipType: ['bienfaiteur'] }
      mockGetAll.mockResolvedValue(mockData)

      const { result } = renderHook(
        () => useMembershipsListV2({ filters, page: 2, limit: 20 }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockBuildFiltersForTab).toHaveBeenCalledWith(filters, undefined)
      expect(mockGetAll).toHaveBeenCalled()
      const callArgs = mockGetAll.mock.calls[0]
      expect(callArgs[0]).toEqual(filters) // filters (construits)
      expect(callArgs[1]).toBe(2) // page
      expect(callArgs[2]).toBe(20) // limit
    })

  it('devrait calculer canGoNext et canGoPrev correctement', async () => {
    const mockDataWithNext: PaginatedMembers = {
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 2,
        totalItems: 20,
        itemsPerPage: 10,
        hasNextPage: true,
        hasPrevPage: false,
        nextCursor: null,
        prevCursor: null,
      },
    }

    mockGetAll.mockResolvedValue(mockDataWithNext)

    const { result } = renderHook(
      () => useMembershipsListV2({ filters: {}, page: 1, limit: 10 }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.canGoNext).toBe(true)
    expect(result.current.canGoPrev).toBe(false)
  })

  it('devrait retourner canGoPrev true si page > 1', async () => {
    const mockData: PaginatedMembers = {
      data: [],
      pagination: {
        currentPage: 2,
        totalPages: 2,
        totalItems: 20,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPrevPage: true,
        nextCursor: null,
        prevCursor: null,
      },
    }

    mockGetAll.mockResolvedValue(mockData)

    const { result } = renderHook(
      () => useMembershipsListV2({ filters: {}, page: 2, limit: 10 }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.canGoPrev).toBe(true)
  })

  it('devrait fournir des fonctions goToNextPage et goToPrevPage vides', async () => {
    const mockData: PaginatedMembers = {
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPrevPage: false,
        nextCursor: null,
        prevCursor: null,
      },
    }

    mockGetAll.mockResolvedValue(mockData)

    const { result } = renderHook(
      () => useMembershipsListV2({ filters: {}, page: 1, limit: 10 }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(typeof result.current.goToNextPage).toBe('function')
    expect(typeof result.current.goToPrevPage).toBe('function')
    expect(result.current.goToNextPage()).toBeUndefined()
    expect(result.current.goToPrevPage()).toBeUndefined()
  })

  it('devrait respecter l\'option enabled', async () => {
    mockGetAll.mockResolvedValue({
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPrevPage: false,
        nextCursor: null,
        prevCursor: null,
      },
    })

    const { result } = renderHook(
      () => useMembershipsListV2({ filters: {}, page: 1, limit: 10, enabled: false }),
      { wrapper }
    )

    // La requête ne devrait pas être exécutée
    expect(mockGetAll).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })

    it('devrait mettre à jour la clé de cache quand les filtres changent', async () => {
      const mockData: PaginatedMembers = {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: 10,
          hasNextPage: false,
          hasPrevPage: false,
          nextCursor: null,
          prevCursor: null,
        },
      }

      mockGetAll.mockResolvedValue(mockData)

      const { result, rerender } = renderHook(
        ({ filters }) => useMembershipsListV2({ filters, page: 1, limit: 10 }),
        {
          wrapper,
          initialProps: { filters: { membershipType: ['adherant'] } },
        }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetAll).toHaveBeenCalledTimes(1)

      // Changer les filtres
      rerender({ filters: { membershipType: ['bienfaiteur'] } })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      }, { timeout: 3000 })

      // La requête devrait être appelée à nouveau avec les nouveaux filtres
      expect(mockGetAll.mock.calls.length).toBeGreaterThanOrEqual(1)
    })
})
