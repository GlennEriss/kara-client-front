/**
 * Hook React Query pour récupérer les statistiques des demandes
 * 
 * Cache : staleTime 15 min, gcTime 30 min
 */

import { useQuery } from '@tanstack/react-query'
import { CaisseImprevueService } from '../services/CaisseImprevueService'
import type { DemandFilters, DemandStats } from '../entities/demand-filters.types'

const service = CaisseImprevueService.getInstance()

export function useCaisseImprevueDemandsStats(filters?: DemandFilters) {
  return useQuery<DemandStats>({
    queryKey: ['caisse-imprevue-demands-stats', filters],
    queryFn: () => service.getDemandsStats(filters),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}
