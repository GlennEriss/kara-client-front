/**
 * Tests unitaires pour useMembershipStats
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMembershipStats } from '../useMembershipStats'
import { MembershipStatsService } from '../../services/MembershipStatsService'
import { MembersRepositoryV2 } from '../../repositories/MembersRepositoryV2'
import type { MemberWithSubscription, PaginatedMembers } from '@/db/member.db'
import type { User } from '@/types/types'

// Helper pour créer un User mock
function createMockUser(
  overrides: Partial<User & { birthMonth?: number; birthDay?: number; birthDayOfYear?: number }> = {},
): User & { birthMonth?: number; birthDay?: number; birthDayOfYear?: number } {
  return {
    id: overrides.id || 'test-user-id',
    matricule: overrides.matricule || '1234.MK.567890',
    firstName: overrides.firstName || 'Jean',
    lastName: overrides.lastName || 'Dupont',
    birthDate: overrides.birthDate || '1990-01-15',
    contacts: overrides.contacts || [],
    gender: overrides.gender || 'Homme',
    nationality: overrides.nationality || 'Gabonaise',
    hasCar: overrides.hasCar ?? false,
    address: overrides.address || {
      province: '',
      city: '',
      district: '',
      arrondissement: '',
    },
    subscriptions: overrides.subscriptions || [],
    dossier: overrides.dossier || '',
    membershipType: overrides.membershipType || 'adherant',
    roles: overrides.roles || ['Adherant'],
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    isActive: overrides.isActive ?? true,
    birthMonth: overrides.birthMonth,
    birthDay: overrides.birthDay,
    birthDayOfYear: overrides.birthDayOfYear,
    ...overrides,
  }
}

// Mock MembershipStatsService
vi.mock('../../services/MembershipStatsService', () => ({
  MembershipStatsService: {
    calculateStats: vi.fn(),
    calculateStatsFromMembers: vi.fn(),
  },
}))

// Mock MembersRepositoryV2
const mockGetAll = vi.fn()
vi.mock('../../repositories/MembersRepositoryV2', () => ({
  MembersRepositoryV2: {
    getInstance: vi.fn(() => ({
      getAll: mockGetAll,
    })),
  },
}))

// Helper pour créer un MemberWithSubscription
function createMemberWithSubscription(
  overrides: Partial<MemberWithSubscription> = {},
): MemberWithSubscription {
  const baseUser = createMockUser(overrides)
  return {
    ...baseUser,
    isSubscriptionValid: overrides.isSubscriptionValid ?? false,
    lastSubscription: overrides.lastSubscription ?? null,
    subscriptions: overrides.subscriptions ?? [],
  }
}

describe('useMembershipStats', () => {
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

  describe('Option A : Calcul depuis membres fournis', () => {
    it('devrait calculer les stats depuis PaginatedMembers', () => {
      const paginated: PaginatedMembers = {
        data: [
          createMemberWithSubscription({ id: '1', isSubscriptionValid: true }),
          createMemberWithSubscription({ id: '2', isSubscriptionValid: false }),
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 2,
          itemsPerPage: 10,
          hasNextPage: false,
          hasPrevPage: false,
          nextCursor: null,
          prevCursor: null,
        },
      }

      const mockStats = {
        total: 2,
        active: 1,
        expired: 0,
        noSub: 1,
        activePercentage: 50,
        expiredPercentage: 0,
        noSubPercentage: 50,
        men: 1,
        women: 1,
        menPercentage: 50,
        womenPercentage: 50,
      }

      vi.mocked(MembershipStatsService.calculateStats).mockReturnValue(mockStats)

      const { result } = renderHook(() => useMembershipStats({ members: paginated }), {
        wrapper,
      })

      expect(result.current.stats).toEqual(mockStats)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isError).toBe(false)
      expect(MembershipStatsService.calculateStats).toHaveBeenCalledWith(paginated)
    })

    it('devrait calculer les stats depuis un tableau de membres', () => {
      const members: MemberWithSubscription[] = [
        createMemberWithSubscription({ id: '1', isSubscriptionValid: true }),
        createMemberWithSubscription({ id: '2', isSubscriptionValid: false }),
      ]

      const mockStats = {
        total: 2,
        active: 1,
        expired: 0,
        noSub: 1,
        activePercentage: 50,
        expiredPercentage: 0,
        noSubPercentage: 50,
        men: 1,
        women: 1,
        menPercentage: 50,
        womenPercentage: 50,
      }

      vi.mocked(MembershipStatsService.calculateStatsFromMembers).mockReturnValue(mockStats)

      const { result } = renderHook(() => useMembershipStats({ members }), { wrapper })

      expect(result.current.stats).toEqual(mockStats)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isError).toBe(false)
      expect(MembershipStatsService.calculateStatsFromMembers).toHaveBeenCalledWith(members)
    })

    it('devrait retourner null si members est null', () => {
      const { result } = renderHook(() => useMembershipStats({ members: null }), { wrapper })

      expect(result.current.stats).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Option B : Récupération stats globales', () => {
    it('devrait récupérer les stats globales depuis Firestore', async () => {
      const mockPaginated: PaginatedMembers = {
        data: [
          createMemberWithSubscription({ id: '1', isSubscriptionValid: true }),
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

      const mockStats = {
        total: 1,
        active: 1,
        expired: 0,
        noSub: 0,
        activePercentage: 100,
        expiredPercentage: 0,
        noSubPercentage: 0,
        men: 1,
        women: 0,
        menPercentage: 100,
        womenPercentage: 0,
      }

      mockGetAll.mockResolvedValue(mockPaginated)
      vi.mocked(MembershipStatsService.calculateStats).mockReturnValue(mockStats)

      const { result } = renderHook(
        () => useMembershipStats({ fetchGlobal: true, enabled: true }),
        { wrapper },
      )

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.stats).toEqual(mockStats)
      expect(mockGetAll).toHaveBeenCalled()
      expect(MembershipStatsService.calculateStats).toHaveBeenCalled()
    })

    it('devrait ne pas récupérer les stats globales si enabled=false', () => {
      const { result } = renderHook(
        () => useMembershipStats({ fetchGlobal: true, enabled: false }),
        { wrapper },
      )

      expect(result.current.isLoading).toBe(false)
      expect(mockGetAll).not.toHaveBeenCalled()
    })

    it('devrait gérer les erreurs lors de la récupération globale', async () => {
      const error = new Error('Firestore error')
      mockGetAll.mockRejectedValue(error)

      const { result } = renderHook(
        () => useMembershipStats({ fetchGlobal: true, enabled: true }),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBe(error)
      expect(result.current.stats).toBeNull()
    })
  })
})
