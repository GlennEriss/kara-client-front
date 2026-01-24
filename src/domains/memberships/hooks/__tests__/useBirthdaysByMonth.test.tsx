/**
 * Tests unitaires pour useBirthdaysByMonth
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBirthdaysByMonth } from '../useBirthdaysByMonth'
import { BirthdaysRepository } from '../../repositories/BirthdaysRepository'
import { createBirthdayFixture } from '../../__tests__/fixtures/birthday.fixture'

// Mock BirthdaysRepository
const mockGetByMonth = vi.fn()
vi.mock('../../repositories/BirthdaysRepository', () => ({
  BirthdaysRepository: {
    getInstance: vi.fn(() => ({
      getByMonth: mockGetByMonth,
    })),
  },
}))

describe('useBirthdaysByMonth', () => {
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

  it('UNIT-UBM-01: devrait charger les anniversaires du mois spécifié', async () => {
    const mockData = [
      createBirthdayFixture({ birthMonth: 1, birthDay: 5 }),
      createBirthdayFixture({ birthMonth: 1, birthDay: 10 }),
      createBirthdayFixture({ birthMonth: 1, birthDay: 15 }),
    ]
    mockGetByMonth.mockResolvedValue(mockData)

    const { result } = renderHook(() => useBirthdaysByMonth({ month: 1, year: 2026 }), {
      wrapper,
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toHaveLength(3)
    expect(result.current.data[0].birthMonth).toBe(1)
    expect(mockGetByMonth).toHaveBeenCalledWith(1, 2026)
  })

  it('UNIT-UBM-02: devrait utiliser le cache pour le même mois', async () => {
    const mockData = [createBirthdayFixture({ birthMonth: 1, birthDay: 5 })]
    mockGetByMonth.mockResolvedValue(mockData)

    const { result, rerender } = renderHook(
      ({ month, year }) => useBirthdaysByMonth({ month, year }),
      {
        wrapper,
        initialProps: { month: 1, year: 2026 },
      },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Changer vers un autre mois
    rerender({ month: 2, year: 2026 })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Revenir au mois précédent (devrait utiliser le cache)
    rerender({ month: 1, year: 2026 })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Le repository devrait être appelé 2 fois (mois 1 et mois 2)
    expect(mockGetByMonth).toHaveBeenCalledTimes(2)
  })

  it('UNIT-UBM-03: devrait gérer les erreurs Firestore', async () => {
    const error = new Error('Firestore error')
    mockGetByMonth.mockRejectedValue(error)

    const { result } = renderHook(() => useBirthdaysByMonth({ month: 1, year: 2026 }), {
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
      () => useBirthdaysByMonth({ month: 1, year: 2026, enabled: false }),
      { wrapper },
    )

    expect(result.current.isLoading).toBe(false)
    expect(mockGetByMonth).not.toHaveBeenCalled()
  })
})
