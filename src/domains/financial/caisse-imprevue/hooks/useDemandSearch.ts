/**
 * Hook React Query pour rechercher des demandes par nom/prénom
 * 
 * Cache : staleTime 2 min, gcTime 5 min
 * Debounce : 300ms (géré dans le composant)
 */

import { useQuery } from '@tanstack/react-query'
import { CaisseImprevueService } from '../services/CaisseImprevueService'
import type { CaisseImprevueDemand } from '../entities/demand.types'
import type { DemandFilters } from '../entities/demand-filters.types'

const service = CaisseImprevueService.getInstance()

export function useDemandSearch(
  query: string,
  filters?: DemandFilters,
  limit: number = 50
) {
  const normalizedQuery = query.trim().toLowerCase()

  return useQuery<CaisseImprevueDemand[]>({
    queryKey: ['demand-search', normalizedQuery, filters, limit],
    queryFn: () => service.searchDemands(normalizedQuery, filters, limit),
    enabled: normalizedQuery.length >= 2, // Recherche activée à partir de 2 caractères
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}
