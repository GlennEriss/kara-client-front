/**
 * Tests unitaires pour useBirthdaySearch
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBirthdaySearch } from '../useBirthdaySearch'
import { BirthdaysAlgoliaService } from '../../services/BirthdaysAlgoliaService'

// Mock BirthdaysAlgoliaService
vi.mock('../../services/BirthdaysAlgoliaService', () => ({
  BirthdaysAlgoliaService: {
    search: vi.fn(),
  },
}))

describe('useBirthdaySearch', () => {
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
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('UNIT-UBS-01: devrait activer la recherche si query.length >= 2', async () => {
    const mockResult = {
      hits: [
        {
          objectID: '1234.MK.567890',
          firstName: 'Jean',
          lastName: 'Dupont',
          birthMonth: 3,
          birthDay: 15,
          photoURL: 'https://example.com/photo.jpg',
        },
      ],
      targetMonth: 3,
    }
    vi.mocked(BirthdaysAlgoliaService.search).mockResolvedValue(mockResult)

    const { result } = renderHook(() => useBirthdaySearch({ query: 'Du' }), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.hits).toHaveLength(1)
    expect(result.current.targetMonth).toBe(3)
    expect(BirthdaysAlgoliaService.search).toHaveBeenCalledWith('Du')
  })

  it('UNIT-UBS-02: devrait ne pas activer la recherche si query.length < 2', () => {
    const { result } = renderHook(() => useBirthdaySearch({ query: 'D' }), { wrapper })

    expect(result.current.isLoading).toBe(false)
    expect(BirthdaysAlgoliaService.search).not.toHaveBeenCalled()
    expect(result.current.hits).toEqual([])
  })

  it('UNIT-UBS-03: devrait retourner targetMonth du premier hit', async () => {
    const mockResult = {
      hits: [
        {
          objectID: '1',
          firstName: 'Jean',
          lastName: 'Dupont',
          birthMonth: 5,
          birthDay: 10,
        },
        {
          objectID: '2',
          firstName: 'Marie',
          lastName: 'Martin',
          birthMonth: 8,
          birthDay: 20,
        },
      ],
      targetMonth: 5,
    }
    vi.mocked(BirthdaysAlgoliaService.search).mockResolvedValue(mockResult)

    const { result } = renderHook(() => useBirthdaySearch({ query: 'test' }), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.targetMonth).toBe(5)
    expect(result.current.hits).toHaveLength(2)
  })

  it('devrait gérer les erreurs Algolia', async () => {
    const error = new Error('Algolia error')
    vi.mocked(BirthdaysAlgoliaService.search).mockRejectedValue(error)

    const { result } = renderHook(() => useBirthdaySearch({ query: 'test' }), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(false) // On catch l'erreur et retourne un résultat vide
    })

    expect(result.current.hits).toEqual([])
    expect(result.current.targetMonth).toBeNull()
  })

  it('devrait utiliser le cache React Query', async () => {
    const mockResult = {
      hits: [],
      targetMonth: null,
    }
    vi.mocked(BirthdaysAlgoliaService.search).mockResolvedValue(mockResult)

    const { result, rerender } = renderHook(
      ({ query }) => useBirthdaySearch({ query }),
      {
        wrapper,
        initialProps: { query: 'test' },
      },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Re-render avec la même query
    rerender({ query: 'test' })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Le service devrait être appelé qu'une fois (cache)
    expect(BirthdaysAlgoliaService.search).toHaveBeenCalledTimes(1)
  })

  it('devrait ne pas rechercher si enabled=false', () => {
    const { result } = renderHook(
      () => useBirthdaySearch({ query: 'test', enabled: false }),
      { wrapper },
    )

    expect(result.current.isLoading).toBe(false)
    expect(BirthdaysAlgoliaService.search).not.toHaveBeenCalled()
  })
})
