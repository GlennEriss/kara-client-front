'use client'

import { useQuery } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { ContractsCIFilters } from '@/repositories/caisse-imprevu/IContractCIRepository'

/**
 * Hook pour récupérer les contrats de Caisse Imprévue avec filtres
 * Utilise le service CaisseImprevueService via ServiceFactory (singleton)
 */
export const useContractsCI = (filters?: ContractsCIFilters) => {
  return useQuery({
    queryKey: ['contractsCI', filters],
    queryFn: async () => {
      try {
        const service = ServiceFactory.getCaisseImprevueService()
        return await service.getContractsCIPaginated(filters)
      } catch (error) {
        console.error('Erreur lors de la récupération des contrats CI:', error)
        throw error
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook pour récupérer les statistiques des contrats CI
 * Utilise le service CaisseImprevueService via ServiceFactory (singleton)
 */
export const useContractsCIStats = () => {
  return useQuery({
    queryKey: ['contractsCIStats'],
    queryFn: async () => {
      try {
        const service = ServiceFactory.getCaisseImprevueService()
        return await service.getContractsCIStats()
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques CI:', error)
        throw error
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Export du type pour utilisation dans les composants
export type { ContractsCIFilters } from '@/repositories/caisse-imprevu/IContractCIRepository'

