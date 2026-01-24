/**
 * Tests unitaires pour useMemberBirthdays
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemberBirthdays } from '../useMemberBirthdays'
import { BirthdaysRepository } from '../../repositories/BirthdaysRepository'
import { createPaginatedBirthdaysFixture } from '../../__tests__/fixtures/birthday.fixture'

// Mock BirthdaysRepository
const mockGetPaginated = vi.fn()
vi.mock('../../repositories/BirthdaysRepository', () => ({
  BirthdaysRepository: {
    getInstance: vi.fn(() => ({
      getPaginated: mockGetPaginated,
    })),
  },
}))

describe('useMemberBirthdays', () => {
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

  it('UNIT-UMB-01: devrait charger les données initiales', async () => {
    const mockData = createPaginatedBirthdaysFixture(20, 1, 100)
    mockGetPaginated.mockResolvedValue(mockData)

    const { result } = renderHook(() => useMemberBirthdays({ page: 1, itemsPerPage: 20 }), {
      wrapper,
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toHaveLength(20)
    expect(result.current.pagination.currentPage).toBe(1)
    expect(result.current.pagination.totalPages).toBe(5)
    expect(result.current.pagination.totalItems).toBe(100)
    expect(mockGetPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
      }),
    )
  })

  it('UNIT-UMB-02: devrait gérer la pagination avec changement de page', async () => {
    const mockDataPage1 = createPaginatedBirthdaysFixture(20, 1, 100)
    const mockDataPage2 = createPaginatedBirthdaysFixture(20, 2, 100)
    mockGetPaginated
      .mockResolvedValueOnce(mockDataPage1)
      .mockResolvedValueOnce(mockDataPage2)

    const { result, rerender } = renderHook(
      ({ page }) => useMemberBirthdays({ page, itemsPerPage: 20 }),
      {
        wrapper,
        initialProps: { page: 1 },
      },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.pagination.currentPage).toBe(1)

    // Aller à la page suivante en changeant la prop page
    rerender({ page: 2 })

    await waitFor(() => {
      expect(result.current.pagination.currentPage).toBe(2)
    })

    expect(mockGetPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 20,
      }),
    )
  })

  it('UNIT-UMB-03: devrait filtrer par mois', async () => {
    const mockData = createPaginatedBirthdaysFixture(20, 1, 50)
    mockGetPaginated.mockResolvedValue(mockData)

    const { result } = renderHook(
      () => useMemberBirthdays({ page: 1, itemsPerPage: 20, months: [1, 2] }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockGetPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
        months: [1, 2],
      }),
    )
  })

  it('UNIT-UMB-04: devrait trier par anniversaire proche', async () => {
    const mockData = createPaginatedBirthdaysFixture(20, 1, 100)
    // Les fixtures créent des membres avec daysUntil croissants (1, 2, 3, ...)
    mockGetPaginated.mockResolvedValue(mockData)

    const { result } = renderHook(() => useMemberBirthdays({ page: 1, itemsPerPage: 20 }), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Vérifier que les données sont triées (premier membre a daysUntil=1)
    expect(result.current.data[0].daysUntil).toBe(1)
    expect(result.current.data[1].daysUntil).toBe(2)
  })

  it('UNIT-UMB-05: devrait utiliser le cache React Query', async () => {
    const mockData = createPaginatedBirthdaysFixture(20, 1, 100)
    mockGetPaginated.mockResolvedValue(mockData)

    const { result, rerender } = renderHook(
      () => useMemberBirthdays({ page: 1, itemsPerPage: 20 }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Re-render avec les mêmes paramètres
    rerender()

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Le repository ne devrait être appelé qu'une fois (cache)
    expect(mockGetPaginated).toHaveBeenCalledTimes(1)
  })

  it('devrait gérer les erreurs', async () => {
    const error = new Error('Firestore error')
    mockGetPaginated.mockRejectedValue(error)

    const { result } = renderHook(() => useMemberBirthdays({ page: 1, itemsPerPage: 20 }), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBe(error)
    expect(result.current.data).toEqual([])
  })

  it('devrait ne pas charger si enabled=false', () => {
    const { result } = renderHook(
      () => useMemberBirthdays({ page: 1, itemsPerPage: 20, enabled: false }),
      { wrapper },
    )

    expect(result.current.isLoading).toBe(false)
    expect(mockGetPaginated).not.toHaveBeenCalled()
  })
})
