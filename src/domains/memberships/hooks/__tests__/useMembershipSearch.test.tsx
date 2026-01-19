/**
 * Tests unitaires pour useMembershipSearch
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useMembershipSearch } from '../useMembershipSearch'
import { getAlgoliaSearchService } from '@/services/search/AlgoliaSearchService'

// Mock AlgoliaSearchService
vi.mock('@/services/search/AlgoliaSearchService', () => ({
  getAlgoliaSearchService: vi.fn(() => ({
    search: vi.fn(),
  })),
}))

// Mock constants
vi.mock('@/constantes/membership-requests', () => ({
  MEMBERSHIP_REQUEST_PAGINATION: {
    DEFAULT_LIMIT: 20,
  },
}))

describe('useMembershipSearch', () => {
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

  it('devrait appeler AlgoliaSearchService avec les bonnes options', async () => {
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
    }

    vi.mocked(getAlgoliaSearchService).mockReturnValue(mockSearchService as any)

    const { result } = renderHook(
      () =>
        useMembershipSearch({
          query: 'test',
          filters: { isPaid: true, status: 'pending' },
          page: 1,
          hitsPerPage: 20,
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockSearchService.search).toHaveBeenCalledWith({
      query: 'test',
      filters: {
        isPaid: true,
        status: 'pending',
      },
      page: 1,
      hitsPerPage: 20,
    })
  })

  it('devrait désactiver la requête si query < 2 caractères et non vide', () => {
    const mockSearchService = {
      search: vi.fn(),
    }

    vi.mocked(getAlgoliaSearchService).mockReturnValue(mockSearchService as any)

    const { result } = renderHook(
      () =>
        useMembershipSearch({
          query: 't', // 1 caractère
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
    }

    vi.mocked(getAlgoliaSearchService).mockReturnValue(mockSearchService as any)

    const { result } = renderHook(
      () =>
        useMembershipSearch({
          query: '',
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockSearchService.search).toHaveBeenCalled()
  })

  it('devrait ignorer le statut "all" dans les filtres', async () => {
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
    }

    vi.mocked(getAlgoliaSearchService).mockReturnValue(mockSearchService as any)

    const { result } = renderHook(
      () =>
        useMembershipSearch({
          query: 'test',
          filters: { status: 'all' },
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockSearchService.search).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          status: undefined,
        }),
      })
    )
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
    }

    vi.mocked(getAlgoliaSearchService).mockReturnValue(mockSearchService as any)

    const { result } = renderHook(() => useMembershipSearch(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockSearchService.search).toHaveBeenCalledWith({
      query: '',
      filters: {},
      page: 1,
      hitsPerPage: 20,
    })
  })
})
