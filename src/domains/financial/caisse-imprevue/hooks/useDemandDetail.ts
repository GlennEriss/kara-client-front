/**
 * Hook React Query pour récupérer les détails d'une demande
 * 
 * Cache : staleTime 10 min, gcTime 20 min
 * Prefetch au survol pour optimisation
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CaisseImprevueService } from '../services/CaisseImprevueService'
import type { CaisseImprevueDemand } from '../entities/demand.types'

const service = CaisseImprevueService.getInstance()

export function useDemandDetail(id: string) {
  return useQuery<CaisseImprevueDemand | null>({
    queryKey: ['demand-detail', id],
    queryFn: () => service.getDemandById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
  })
}

/**
 * Prefetch les détails d'une demande (optimisation)
 */
export function usePrefetchDemandDetail() {
  const queryClient = useQueryClient()

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ['demand-detail', id],
      queryFn: () => service.getDemandById(id),
      staleTime: 10 * 60 * 1000,
    })
  }
}
