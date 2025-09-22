import { useQuery } from '@tanstack/react-query'
import { RepositoryFactory } from '@/factories/RepositoryFactory'
import { User } from '@/types/types'

/**
 * Hook pour récupérer un membre par son ID avec React Query
 * 
 * @param {string} memberId - L'ID/matricule du membre
 * @returns {Object} - État de la requête avec les données du membre
 */
export function useMember(memberId: string) {
  const memberRepository = RepositoryFactory.getMemberRepository()

  return useQuery({
    queryKey: ['member', memberId],
    queryFn: async (): Promise<User | null> => {
      if (!memberId || memberId.trim().length === 0) {
        throw new Error('ID du membre requis')
      }
      
      return await memberRepository.getMemberById(memberId.trim())
    },
    enabled: !!memberId && memberId.trim().length > 0, // Ne pas exécuter si pas d'ID
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (anciennement cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Hook pour récupérer plusieurs membres par leurs IDs
 * 
 * @param {string[]} memberIds - Les IDs/matricules des membres
 * @returns {Object} - État de la requête avec les données des membres
 */
export function useMembers(memberIds: string[]) {
  const memberRepository = RepositoryFactory.getMemberRepository()

  return useQuery({
    queryKey: ['members', memberIds],
    queryFn: async (): Promise<User[]> => {
      if (!memberIds || memberIds.length === 0) {
        return []
      }

      const validIds = memberIds.filter(id => id && id.trim().length > 0)
      if (validIds.length === 0) {
        return []
      }

      // Récupérer les membres un par un (on pourrait optimiser avec getUsersByIds si disponible)
      const members = await Promise.all(
        validIds.map(id => memberRepository.getMemberById(id))
      )

      return members.filter((member): member is User => member !== null)
    },
    enabled: !!memberIds && memberIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (anciennement cacheTime)
    retry: 2
  })
}
