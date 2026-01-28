/**
 * Hook React Query pour récupérer la liste des demandes avec pagination serveur
 * 
 * Cache : staleTime 5 min, gcTime 10 min
 */

import { useQuery } from '@tanstack/react-query'
import { CaisseImprevueService } from '../services/CaisseImprevueService'
import type { DemandFilters, PaginationParams, SortParams, PaginatedDemands } from '../entities/demand-filters.types'

const service = CaisseImprevueService.getInstance()

export function useCaisseImprevueDemands(
  filters?: DemandFilters,
  pagination?: PaginationParams,
  sort?: SortParams
) {
  return useQuery<PaginatedDemands>({
    queryKey: ['caisse-imprevue-demands', filters, pagination, sort],
    queryFn: () => service.getPaginatedDemands(filters, pagination, sort),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}
