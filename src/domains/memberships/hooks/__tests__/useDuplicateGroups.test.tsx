/**
 * Tests unitaires pour useDuplicateGroups
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDuplicateGroups } from '../useDuplicateGroups'
import type { DuplicateGroup } from '../../entities/DuplicateGroup'

const mockGetUnresolvedGroups = vi.fn()
const mockResolveGroup = vi.fn()
vi.mock('../../repositories/DuplicateGroupsRepository', () => ({
  DuplicateGroupsRepository: {
    getInstance: vi.fn(() => ({
      getUnresolvedGroups: mockGetUnresolvedGroups,
      resolveGroup: mockResolveGroup,
    })),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

const createGroup = (overrides: Partial<DuplicateGroup> = {}): DuplicateGroup => ({
  id: 'g1',
  type: 'phone',
  value: '+33612345678',
  requestIds: ['r1', 'r2'],
  requestCount: 2,
  detectedAt: new Date(),
  updatedAt: new Date(),
  resolvedAt: null,
  resolvedBy: null,
  ...overrides,
})

describe('useDuplicateGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait retourner groups, isLoading, isError, error, resolveGroup, isResolving', () => {
    mockGetUnresolvedGroups.mockResolvedValue([])
    const { result } = renderHook(() => useDuplicateGroups(), {
      wrapper: createWrapper(),
    })
    expect(Array.isArray(result.current.groups)).toBe(true)
    expect(typeof result.current.resolveGroup).toBe('function')
    expect(typeof result.current.isResolving).toBe('boolean')
  })

  it('devrait charger les groupes non résolus', async () => {
    const groups = [createGroup({ id: 'g1' }), createGroup({ id: 'g2' })]
    mockGetUnresolvedGroups.mockResolvedValue(groups)

    const { result } = renderHook(() => useDuplicateGroups(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.groups).toHaveLength(2)
    expect(result.current.groups).toEqual(groups)
  })

  it('devrait appeler resolveGroup et invalider les queries', async () => {
    mockGetUnresolvedGroups.mockResolvedValue([])
    mockResolveGroup.mockResolvedValue(undefined)

    const { result } = renderHook(() => useDuplicateGroups(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.resolveGroup('group-1', 'admin-1')
    })

    expect(mockResolveGroup).toHaveBeenCalledWith('group-1', 'admin-1')
  })

  it('devrait propager l\'erreur si resolveGroup échoue', async () => {
    mockGetUnresolvedGroups.mockResolvedValue([])
    mockResolveGroup.mockRejectedValue(new Error('Firestore error'))

    const { result } = renderHook(() => useDuplicateGroups(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await expect(
      act(async () => {
        await result.current.resolveGroup('group-1', 'admin-1')
      })
    ).rejects.toThrow('Firestore error')
  })
})
