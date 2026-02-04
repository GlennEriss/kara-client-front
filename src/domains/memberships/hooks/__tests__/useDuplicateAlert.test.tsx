/**
 * Tests unitaires pour useDuplicateAlert
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDuplicateAlert } from '../useDuplicateAlert'

const mockHasUnresolvedGroups = vi.fn()
vi.mock('../../repositories/DuplicateGroupsRepository', () => ({
  DuplicateGroupsRepository: {
    getInstance: vi.fn(() => ({
      hasUnresolvedGroups: mockHasUnresolvedGroups,
    })),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('useDuplicateAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait retourner hasDuplicates à false et isLoading à true initialement', () => {
    mockHasUnresolvedGroups.mockImplementation(
      () => new Promise(() => {}) // jamais résolu
    )
    const { result } = renderHook(() => useDuplicateAlert(), {
      wrapper: createWrapper(),
    })
    expect(result.current.hasDuplicates).toBe(false)
    expect(result.current.isLoading).toBe(true)
  })

  it('devrait retourner hasDuplicates à true quand le repository retourne true', async () => {
    mockHasUnresolvedGroups.mockResolvedValue(true)
    const { result } = renderHook(() => useDuplicateAlert(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.hasDuplicates).toBe(true)
    expect(mockHasUnresolvedGroups).toHaveBeenCalled()
  })

  it('devrait retourner hasDuplicates à false quand le repository retourne false', async () => {
    mockHasUnresolvedGroups.mockResolvedValue(false)
    const { result } = renderHook(() => useDuplicateAlert(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.hasDuplicates).toBe(false)
  })
})
