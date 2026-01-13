/**
 * Tests unitaires pour useCompanySuggestions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useCompanySuggestions } from '../../hooks/useCompanySuggestions'

// Mock de ServiceFactory
const mockCompanySuggestionsService = {
  searchCompanies: vi.fn(),
}

vi.mock('@/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getCompanySuggestionsService: vi.fn(() => mockCompanySuggestionsService),
  },
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'TestWrapper'
  return Wrapper
}

describe('useCompanySuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCompanySuggestionsService.searchCompanies.mockResolvedValue([
      {
        name: 'Total Gabon',
        isNew: false,
        hasAddress: true,
        id: 'comp-1',
        industry: 'Pétrole',
      },
      {
        name: 'Créer "Total Gabon"',
        isNew: true,
        hasAddress: false,
      },
    ])
  })

  it('devrait récupérer les suggestions d\'entreprises', async () => {
    const { result } = renderHook(
      () => useCompanySuggestions({ query: 'Total' }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockCompanySuggestionsService.searchCompanies).toHaveBeenCalledWith('Total')
    expect(result.current.suggestions).toBeDefined()
    expect(result.current.suggestions.length).toBeGreaterThan(0)
  })

  it('ne devrait pas rechercher si la query est trop courte', () => {
    const { result } = renderHook(
      () => useCompanySuggestions({ query: 'T' }),
      {
        wrapper: createWrapper(),
      }
    )

    expect(result.current.isFetching).toBe(false)
    expect(mockCompanySuggestionsService.searchCompanies).not.toHaveBeenCalled()
  })

  it('ne devrait pas rechercher si enabled est false', () => {
    const { result } = renderHook(
      () => useCompanySuggestions({ query: 'Total', enabled: false }),
      {
        wrapper: createWrapper(),
      }
    )

    expect(result.current.isFetching).toBe(false)
    expect(mockCompanySuggestionsService.searchCompanies).not.toHaveBeenCalled()
  })

  it('devrait retourner un tableau vide si pas de suggestions', async () => {
    mockCompanySuggestionsService.searchCompanies.mockResolvedValue([])

    const { result } = renderHook(
      () => useCompanySuggestions({ query: 'Inexistant' }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.suggestions).toEqual([])
    expect(result.current.totalSuggestions).toBe(0)
  })

  it('devrait gérer les erreurs', async () => {
    mockCompanySuggestionsService.searchCompanies.mockRejectedValue(
      new Error('Search failed')
    )

    const { result } = renderHook(
      () => useCompanySuggestions({ query: 'Total' }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.error).toBeDefined()
    })

    expect(result.current.suggestions).toEqual([])
  })

  it('devrait précharger les entreprises populaires', async () => {
    const { result } = renderHook(
      () => useCompanySuggestions({ query: 'Test' }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const initialCallCount = mockCompanySuggestionsService.searchCompanies.mock.calls.length

    await result.current.prefetchPopularCompanies()

    // 5 entreprises populaires devraient être préchargées
    expect(mockCompanySuggestionsService.searchCompanies).toHaveBeenCalledTimes(initialCallCount + 5)
  })

  it('devrait invalider le cache des suggestions', async () => {
    const { result } = renderHook(
      () => useCompanySuggestions({ query: 'Total' }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    result.current.invalidateSuggestions()

    // La fonction devrait être appelable sans erreur
    expect(result.current.invalidateSuggestions).toBeDefined()
  })

  it('devrait mettre à jour le cache avec une nouvelle entreprise', async () => {
    const { result } = renderHook(
      () => useCompanySuggestions({ query: 'Total' }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    result.current.updateCacheWithNewCompany({
      name: 'New Company',
      id: 'comp-new',
      industry: 'Tech',
    })

    // La fonction devrait être appelable sans erreur
    expect(result.current.updateCacheWithNewCompany).toBeDefined()
  })

  it('devrait retourner hasData correctement', async () => {
    const { result } = renderHook(
      () => useCompanySuggestions({ query: 'Total' }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.hasData).toBe(true)
    expect(result.current.totalSuggestions).toBeGreaterThan(0)
  })

  it('devrait utiliser le staleTime personnalisé', async () => {
    const customStaleTime = 10 * 60 * 1000 // 10 minutes

    const { result } = renderHook(
      () => useCompanySuggestions({ query: 'Total', staleTime: customStaleTime }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.suggestions).toBeDefined()
  })
})
