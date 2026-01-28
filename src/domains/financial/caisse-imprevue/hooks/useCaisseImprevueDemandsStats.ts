/**
 * Hook React Query pour récupérer les statistiques des demandes
 * 
 * Cache : staleTime 15 min, gcTime 30 min
 * 
 * ⚠️ IMPORTANT : Les stats sont GLOBALES et indépendantes du filtre de statut
 * On ne passe pas le filtre de statut pour que les stats restent constantes
 * même quand on change de tab (PENDING, APPROVED, etc.)
 */

import { useQuery } from '@tanstack/react-query'
import { CaisseImprevueService } from '../services/CaisseImprevueService'
import type { DemandFilters, DemandStats } from '../entities/demand-filters.types'

const service = CaisseImprevueService.getInstance()

export function useCaisseImprevueDemandsStats(filters?: DemandFilters) {
  // Créer un filtre sans le statut pour les stats globales
  const statsFilters: DemandFilters = filters
    ? {
        // Exclure le filtre de statut pour avoir les stats globales
        subscriptionCIID: filters.subscriptionCIID,
        memberId: filters.memberId,
        decisionMadeBy: filters.decisionMadeBy,
        dateStart: filters.dateStart,
        dateEnd: filters.dateEnd,
        // Ne pas inclure status ni paymentFrequency
      }
    : undefined

  return useQuery<DemandStats>({
    queryKey: ['caisse-imprevue-demands-stats', statsFilters],
    queryFn: () => service.getDemandsStats(statsFilters),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}
