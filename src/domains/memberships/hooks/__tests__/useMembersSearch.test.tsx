/**
 * Tests unitaires pour useMembersSearch
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useMembersSearch, useMembersSearchWithUserFilters } from '../useMembersSearch'
import { getMembersAlgoliaSearchService } from '@/services/search/MembersAlgoliaSearchService'

// Mock MembersAlgoliaSearchService
vi.mock('@/services/search/MembersAlgoliaSearchService', () => ({
  getMembersAlgoliaSearchService: vi.fn(() => ({
    search: vi.fn(),
    isAvailable: vi.fn(() => true),
  })),
}))

describe('useMembersSearch', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('devrait appeler MembersAlgoliaSearchService avec les bonnes options', async () => {
    const mockSearchService = {
      search: vi.fn().mockResolvedValue({
        items: [],
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }),
      isAvailable: vi.fn(() => true),
    }

    vi.mocked(getMembersAlgoliaSearchService).mockReturnValue(mockSearchService as any)

    const { result } = renderHook(
      () =>
        useMembersSearch({
          query: 'jean dupont',
          filters: {
            membershipType: 'adherant',
            isActive: true,
            hasCar: false,
          },
          page: 1,
          hitsPerPage: 20,
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockSearchService.search).toHaveBeenCalledWith({
      query: 'jean dupont',
      filters: {
        membershipType: 'adherant',
        roles: undefined,
        isActive: true,
        gender: undefined,
        hasCar: false,
        province: undefined,
        city: undefined,
        arrondissement: undefined,
        companyId: undefined,
        companyName: undefined,
        professionId: undefined,
        profession: undefined,
      },
      page: 1,
      hitsPerPage: 20,
      sortBy: 'created_desc',
    })
  })

  it('devrait désactiver la requête si query < 2 caractères et non vide', () => {
    const mockSearchService = {
      search: vi.fn(),
      isAvailable: vi.fn(() => true),
    }

    vi.mocked(getMembersAlgoliaSearchService).mockReturnValue(mockSearchService as any)

    const { result } = renderHook(
      () =>
        useMembersSearch({
          query: 'j', // 1 caractère
        }),
      { wrapper }
    )

    expect(result.current.isFetching).toBe(false)
    expect(mockSearchService.search).not.toHaveBeenCalled()
  })

  it('devrait activer la requête si query est vide', async () => {
    const mockSearchService = {
      search: vi.fn().mockResolvedValue({
        items: [],
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }),
      isAvailable: vi.fn(() => true),
    }

    vi.mocked(getMembersAlgoliaSearchService).mockReturnValue(mockSearchService as any)

    const { result } = renderHook(
      () =>
        useMembersSearch({
          query: '',
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockSearchService.search).toHaveBeenCalled()
  })

  it('devrait activer la requête si query >= 2 caractères', async () => {
    const mockSearchService = {
      search: vi.fn().mockResolvedValue({
        items: [],
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }),
      isAvailable: vi.fn(() => true),
    }

    vi.mocked(getMembersAlgoliaSearchService).mockReturnValue(mockSearchService as any)

    const { result } = renderHook(
      () =>
        useMembersSearch({
          query: 'je', // 2 caractères
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockSearchService.search).toHaveBeenCalled()
  })

  it('devrait utiliser les valeurs par défaut si non spécifiées', async () => {
    const mockSearchService = {
      search: vi.fn().mockResolvedValue({
        items: [],
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }),
      isAvailable: vi.fn(() => true),
    }

    vi.mocked(getMembersAlgoliaSearchService).mockReturnValue(mockSearchService as any)

    const { result } = renderHook(() => useMembersSearch(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockSearchService.search).toHaveBeenCalledWith({
      query: '',
      filters: {
        membershipType: undefined,
        roles: undefined,
        isActive: undefined,
        gender: undefined,
        hasCar: undefined,
        province: undefined,
        city: undefined,
        arrondissement: undefined,
        companyId: undefined,
        companyName: undefined,
        professionId: undefined,
        profession: undefined,
      },
      page: 1,
      hitsPerPage: 20,
      sortBy: 'created_desc',
    })
  })

  it('devrait désactiver la requête si Algolia n\'est pas disponible', () => {
    const mockSearchService = {
      search: vi.fn(),
      isAvailable: vi.fn(() => false),
    }

    vi.mocked(getMembersAlgoliaSearchService).mockReturnValue(mockSearchService as any)

    const { result } = renderHook(
      () =>
        useMembersSearch({
          query: 'jean',
        }),
      { wrapper }
    )

    expect(result.current.isFetching).toBe(false)
    expect(mockSearchService.search).not.toHaveBeenCalled()
  })

  it('devrait respecter l\'option enabled', () => {
    const mockSearchService = {
      search: vi.fn(),
      isAvailable: vi.fn(() => true),
    }

    vi.mocked(getMembersAlgoliaSearchService).mockReturnValue(mockSearchService as any)

    const { result } = renderHook(
      () =>
        useMembersSearch({
          query: 'jean',
          enabled: false,
        }),
      { wrapper }
    )

    expect(result.current.isFetching).toBe(false)
    expect(mockSearchService.search).not.toHaveBeenCalled()
  })
})

describe('useMembersSearchWithUserFilters', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('devrait mapper UserFilters vers MembersSearchFilters', async () => {
    const mockSearchService = {
      search: vi.fn().mockResolvedValue({
        items: [],
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }),
      isAvailable: vi.fn(() => true),
    }

    vi.mocked(getMembersAlgoliaSearchService).mockReturnValue(mockSearchService as any)

    const { result } = renderHook(
      () =>
        useMembersSearchWithUserFilters(
          {
            searchQuery: 'jean',
            membershipType: ['adherant'],
            isActive: true,
            hasCar: false,
            province: 'Estuaire',
            city: 'Libreville',
            companyName: 'KARA Gabon',
            profession: 'Ingénieur',
            orderByField: 'lastName',
            orderByDirection: 'asc',
          },
          1,
          20
        ),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockSearchService.search).toHaveBeenCalledWith({
      query: 'jean',
      filters: {
        membershipType: 'adherant',
        roles: undefined,
        isActive: true,
        gender: undefined,
        hasCar: false,
        province: 'Estuaire',
        city: 'Libreville',
        arrondissement: undefined,
        companyId: undefined,
        companyName: 'KARA Gabon',
        professionId: undefined,
        profession: 'Ingénieur',
      },
      page: 1,
      hitsPerPage: 20,
      sortBy: 'name_asc',
    })
  })

  it('devrait utiliser created_desc par défaut si orderByField n\'est pas lastName', async () => {
    const mockSearchService = {
      search: vi.fn().mockResolvedValue({
        items: [],
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }),
      isAvailable: vi.fn(() => true),
    }

    vi.mocked(getMembersAlgoliaSearchService).mockReturnValue(mockSearchService as any)

    const { result } = renderHook(
      () =>
        useMembersSearchWithUserFilters(
          {
            searchQuery: 'jean',
            orderByField: 'createdAt',
            orderByDirection: 'desc',
          },
          1,
          20
        ),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockSearchService.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sortBy: 'created_desc',
      })
    )
  })
})
