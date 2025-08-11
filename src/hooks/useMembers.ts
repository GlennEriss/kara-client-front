import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getMembers, 
  getMemberWithSubscription, 
  getMemberSubscriptions, 
  getMemberStats,
  searchMembers,
  getMembershipRequestByDossier,
  PaginatedMembers,
  MemberWithSubscription
} from '@/db/member.db'
import { getUserById } from '@/db/user.db'
import { User, UserFilters, Subscription, UserStats, MembershipRequest } from '@/types/types'

/**
 * Hook pour récupérer la liste des membres avec pagination et filtres
 */
export function useMembers(
  filters: UserFilters = {},
  page: number = 1,
  itemsPerPage: number = 10
) {
  return useQuery<PaginatedMembers>({
    queryKey: ['members', filters, page, itemsPerPage],
    queryFn: () => getMembers(filters, page, itemsPerPage),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook pour récupérer un membre avec sa dernière subscription
 */
export function useMemberWithSubscription(userId: string) {
  return useQuery<MemberWithSubscription | null>({
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