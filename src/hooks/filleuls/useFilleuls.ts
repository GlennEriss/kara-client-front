import { useQuery } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { Filleul } from '@/types/types'
import { useMember } from './useMember'

/**
 * Hook pour récupérer les filleuls d'un membre par son code intermédiaire avec React Query
 * 
 * @param {string} intermediaryCode - Le code intermédiaire du parrain
 * @returns {Object} - État de la requête avec la liste des filleuls
 */
export function useFilleuls(intermediaryCode: string) {
  const filleulService = ServiceFactory.getFilleulService()

  return useQuery({
    queryKey: ['filleuls', intermediaryCode],
    queryFn: async (): Promise<Filleul[]> => {
      if (!intermediaryCode || intermediaryCode.trim().length === 0) {
        throw new Error('Code intermédiaire requis')
      }
      
      return await filleulService.getFilleulsByIntermediaryCode(intermediaryCode.trim())
    },
    enabled: !!intermediaryCode && intermediaryCode.trim().length > 0, // Ne pas exécuter si pas de code
    staleTime: 2 * 60 * 1000, // 2 minutes (plus court car les filleuls peuvent changer)
    gcTime: 5 * 60 * 1000, // 5 minutes (anciennement cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Hook pour récupérer les statistiques des filleuls d'un membre
 * 
 * @param {string} intermediaryCode - Le code intermédiaire du parrain
 * @returns {Object} - État de la requête avec les statistiques
 */
export function useFilleulsStats(intermediaryCode: string) {
  const filleulService = ServiceFactory.getFilleulService()

  return useQuery({
    queryKey: ['filleuls-stats', intermediaryCode],
    queryFn: async () => {
      if (!intermediaryCode || intermediaryCode.trim().length === 0) {
        throw new Error('Code intermédiaire requis')
      }
      
      return await filleulService.getFilleulsStats(intermediaryCode.trim())
    },
    enabled: !!intermediaryCode && intermediaryCode.trim().length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (anciennement cacheTime)
    retry: 2
  })
}

/**
 * Hook combiné pour récupérer un membre et ses filleuls
 * 
 * @param {string} memberId - L'ID/matricule du membre
 * @returns {Object} - États des requêtes pour le membre et ses filleuls
 */
export function useMemberWithFilleuls(memberId: string) {
  const memberQuery = useMember(memberId)
  
  // Utiliser le code intermédiaire du membre pour récupérer ses filleuls
  const intermediaryCode = memberQuery.data?.matricule || ''
  const filleulsQuery = useFilleuls(intermediaryCode)

  return {
    member: memberQuery,
    filleuls: filleulsQuery,
    isLoading: memberQuery.isLoading || filleulsQuery.isLoading,
    isError: memberQuery.isError || filleulsQuery.isError,
    error: memberQuery.error || filleulsQuery.error
  }
}
