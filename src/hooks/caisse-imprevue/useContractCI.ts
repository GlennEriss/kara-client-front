'use client'

import { useQuery } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'

/**
 * Hook pour récupérer un contrat CI par son ID
 * Utilise le service CaisseImprevueService via ServiceFactory (singleton)
 */
export const useContractCI = (contractId: string | undefined) => {
  return useQuery({
    queryKey: ['contractCI', contractId],
    queryFn: async () => {
      if (!contractId) return null
      
      try {
        const service = ServiceFactory.getCaisseImprevueService()
        return await service.getContractCIById(contractId)
      } catch (error) {
        console.error('Erreur lors de la récupération du contrat CI:', error)
        throw error
      }
    },
    enabled: !!contractId, // Ne lance la requête que si contractId est défini
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

