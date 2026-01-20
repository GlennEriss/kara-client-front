/**
 * Hook React Query pour la recherche Algolia des demandes d'adhésion
 * 
 * Utilise AlgoliaSearchService pour effectuer des recherches avancées
 * avec filtres et pagination.
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { getAlgoliaSearchService, type SearchOptions } from '@/services/search/AlgoliaSearchService'
import type { MembershipRequestFilters } from '../entities'
import { MEMBERSHIP_REQUEST_PAGINATION } from '@/constantes/membership-requests'

export interface UseMembershipSearchOptions {
  query?: string
  filters?: MembershipRequestFilters
  page?: number
  hitsPerPage?: number
  enabled?: boolean
}

/**
 * Hook pour rechercher des demandes d'adhésion via Algolia
 * 
 * @param options - Options de recherche
 * @returns Résultat de la requête React Query avec les items et la pagination
 */
export function useMembershipSearch(options: UseMembershipSearchOptions = {}) {
  const {
    query = '',
    filters = {},
    page = 1,
    hitsPerPage = MEMBERSHIP_REQUEST_PAGINATION.DEFAULT_LIMIT,
    enabled = true,
  } = options

  const searchService = getAlgoliaSearchService()

  // Construire les options de recherche Algolia
  const searchOptions: SearchOptions = {
    query: query.trim(),
    filters: {
      isPaid: filters.isPaid,
      status: filters.status && filters.status !== 'all' ? filters.status : undefined,
    },
    page,
    hitsPerPage,
  }

  return useQuery({
    queryKey: ['membership-search', searchOptions],
    queryFn: () => searchService.search(searchOptions),
    staleTime: 30000, // 30 secondes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: enabled && (query.trim().length >= 2 || query.trim().length === 0), // Activer seulement si query >= 2 caractères ou vide
    refetchOnWindowFocus: false,
  })
}
