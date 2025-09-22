import { useQuery } from '@tanstack/react-query'
import { getUserById, getAllUsers } from '@/db/user.db'
import { getMembersByGroup } from '@/db/member.db'
import { UserFilters } from '@/types/types'

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

// Alias pour useMember (pour compatibilité)
export const useUser = useMember

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