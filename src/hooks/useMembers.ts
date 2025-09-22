import { useQuery } from '@tanstack/react-query'
import { getUserById } from '@/db/user.db'
import { getMembersByGroup } from '@/db/member.db'

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