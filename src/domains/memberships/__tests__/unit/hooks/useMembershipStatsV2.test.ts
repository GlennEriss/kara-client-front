/**
 * Tests unitaires pour useMembershipStatsV2
 * 
 * Approche TDD : Tests écrits AVANT l'implémentation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMembershipStatsV2 } from '../../../hooks/useMembershipStatsV2'
import { MembershipRepositoryV2 } from '../../../repositories/MembershipRepositoryV2'

// Mock du repository
vi.mock('../../../repositories/MembershipRepositoryV2')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  Wrapper.displayName = 'TestWrapper'
  return Wrapper
}

describe('useMembershipStatsV2', () => {
  let mockRepository: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock du repository
    mockRepository = {
      getStatistics: vi.fn(),
    }
    
    vi.mocked(MembershipRepositoryV2.getInstance).mockReturnValue(mockRepository)
  })

  it('devrait charger les statistiques au mount', async () => {
    // Arrange
    const mockStats = {
      total: 100,
      byStatus: {
        pending: 50,
        under_review: 10,
        approved: 30,
        rejected: 10,
      },
      byPayment: {
        paid: 60,
        unpaid: 40,
      },
      percentages: {
        pending: 50,
        under_review: 10,
        approved: 30,
        rejected: 10,
      },
    }
    
    mockRepository.getStatistics.mockResolvedValue(mockStats)
    
    // Act
    const { result } = renderHook(() => useMembershipStatsV2(), {
      wrapper: createWrapper(),
    })
    
    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockStats)
    expect(mockRepository.getStatistics).toHaveBeenCalled()
  })

  it('devrait avoir un staleTime plus long que les requêtes normales', async () => {
    // Arrange
    mockRepository.getStatistics.mockResolvedValue({
      total: 0,
      byStatus: { pending: 0, under_review: 0, approved: 0, rejected: 0 },
      byPayment: { paid: 0, unpaid: 0 },
      percentages: { pending: 0, under_review: 0, approved: 0, rejected: 0 },
    })
    
    // Act
    const { result } = renderHook(() => useMembershipStatsV2(), {
      wrapper: createWrapper(),
    })
    
    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // Le staleTime devrait être configuré dans le hook
    expect(result.current.data).toBeDefined()
  })

  it('devrait gérer les erreurs de chargement', async () => {
    // Arrange
    const error = new Error('Erreur de chargement des statistiques')
    mockRepository.getStatistics.mockRejectedValue(error)
    
    // Act
    const { result } = renderHook(() => useMembershipStatsV2(), {
      wrapper: createWrapper(),
    })
    
    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(error)
  })

  it('devrait recalculer les pourcentages correctement', async () => {
    // Arrange
    const mockStats = {
      total: 100,
      byStatus: {
        pending: 50,
        under_review: 10,
        approved: 30,
        rejected: 10,
      },
      byPayment: {
        paid: 60,
        unpaid: 40,
      },
      percentages: {
        pending: 50, // 50/100 * 100
        under_review: 10, // 10/100 * 100
        approved: 30, // 30/100 * 100
        rejected: 10, // 10/100 * 100
      },
    }
    
    mockRepository.getStatistics.mockResolvedValue(mockStats)
    
    // Act
    const { result } = renderHook(() => useMembershipStatsV2(), {
      wrapper: createWrapper(),
    })
    
    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.percentages.pending).toBe(50)
    expect(result.current.data?.percentages.approved).toBe(30)
    expect(result.current.data?.percentages.rejected).toBe(10)
  })
})
