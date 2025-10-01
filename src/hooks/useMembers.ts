import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { getUserById, getAllUsers, getUsersPage } from '@/db/user.db'
import { getMembersByGroup, getMembershipRequestByDossier, getMemberStats, getMemberSubscriptions, getMemberWithSubscription, MemberWithSubscription, searchMembers } from '@/db/member.db'
import { Subscription, User, UserFilters, UserStats } from '@/types/types'

// Hook pour récupérer tous les membres avec pagination et filtres
export function useAllMembers(filters: UserFilters = {}, page: number = 1, limit: number = 12) {
  return useQuery({
    queryKey: ['allMembers', filters, page, limit],
    queryFn: async () => {
      const result = await getAllUsers({
        ...filters,
        limit: limit,
        // Note: getAllUsers ne semble pas supporter la pagination directement
        // Il faudrait peut-être implémenter une logique de pagination côté client
      })
      
      // Simulation de pagination côté client
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedUsers = result.users.slice(startIndex, endIndex)
      
      return {
        data: paginatedUsers,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(result.total / limit),
          totalItems: result.total,
          itemsPerPage: limit,
          hasNextPage: endIndex < result.total,
          hasPrevPage: page > 1,
          nextCursor: null,
          prevCursor: null
        }
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useMember(memberId?: string) {
  return useQuery({
    queryKey: ['member', memberId],
    queryFn: () => getUserById(memberId!),
    enabled: !!memberId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useMembers(memberIds: string[]) {
  return useQuery({
    queryKey: ['members', memberIds],
    queryFn: async () => {
      const { getUsersByIds } = await import('@/db/user.db')
      return getUsersByIds(memberIds)
    },
    enabled: memberIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Pagination côté serveur pour lister des utilisateurs (pour dialogues d'ajout groupe)
export function useMembersPage(limit: number = 20) {
  return useQuery({
    queryKey: ['members', 'page', limit],
    queryFn: () => getUsersPage({ limit }),
    staleTime: 2 * 60 * 1000,
  })
}

export function useInfiniteMembers(limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ['members', 'infinite', limit],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => getUsersPage({ limit, cursorCreatedAt: pageParam }),
    getNextPageParam: (lastPage: { nextCursorCreatedAt: string | null }) => lastPage.nextCursorCreatedAt || undefined,
    initialPageParam: undefined,
    staleTime: 2 * 60 * 1000,
  } as any)
}

// Hook pour récupérer les membres d'un groupe
export function useGroupMembers(groupId?: string, enabled = true) {
  return useQuery({
    queryKey: ['groupMembers', groupId],
    queryFn: () => getMembersByGroup(groupId!),
    enabled: enabled && !!groupId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook pour récupérer un membre avec sa dernière subscription
 */
export function useMemberWithSubscription(userId: string) {
  return useQuery<MemberWithSubscription   | null>({
    queryKey: ['member', userId, 'with-subscription'],
    queryFn: () => getMemberWithSubscription(userId),
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  })
}

/**
 * Hook pour récupérer toutes les subscriptions d'un membre
 */
export function useMemberSubscriptions(userId: string) {
  return useQuery<Subscription[]>({
    queryKey: ['member', userId, 'subscriptions'],
    queryFn: () => getMemberSubscriptions(userId),
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  })
}

/**
 * Hook pour récupérer un utilisateur par son ID/matricule
 */
export function useUser(userId: string) {
  return useQuery<User | null>({
    queryKey: ['user', userId],
    queryFn: () => getUserById(userId),
    enabled: !!userId,
    staleTime: 3 * 60 * 1000,
  })
}

/**
 * Hook pour récupérer les statistiques des membres
 */
export function useMemberStats() {
  return useQuery<UserStats>({
    queryKey: ['members', 'stats'],
    queryFn: getMemberStats,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  })
}

/**
 * Hook pour la recherche de membres
 */
export function useSearchMembers(searchTerm: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['members', 'search', searchTerm],
    queryFn: () => searchMembers(searchTerm),
    enabled: enabled && searchTerm.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook pour récupérer le MembershipRequest associé à un User
 */
export function useMembershipRequestByDossier(dossierId: string) {
  return useQuery<any>({
    queryKey: ['membership-request', dossierId],
    queryFn: () => getMembershipRequestByDossier(dossierId),
    enabled: !!dossierId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook pour invalider le cache des membres
 */
export function useInvalidateMembers() {
  const queryClient = useQueryClient()
  
  return {
    invalidateMembers: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
    invalidateMemberStats: () => {
      queryClient.invalidateQueries({ queryKey: ['members', 'stats'] })
    },
    invalidateMember: (userId: string) => {
      queryClient.invalidateQueries({ queryKey: ['member', userId] })
    }
  }
}

/**
 * Types pour les hooks
 */
export type UseMembersResult = ReturnType<typeof useMembers>
export type UseMemberStatsResult = ReturnType<typeof useMemberStats>
export type UseSearchMembersResult = ReturnType<typeof useSearchMembers>