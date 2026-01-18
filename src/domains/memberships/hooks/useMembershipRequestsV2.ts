/**
 * Hook React Query pour récupérer les demandes d'adhésion V2
 * 
 * Utilise le Repository V2 et les constantes centralisées
 */

'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MembershipRepositoryV2 } from '../repositories/MembershipRepositoryV2'
import { MEMBERSHIP_REQUEST_CACHE, MEMBERSHIP_REQUEST_PAGINATION } from '@/constantes/membership-requests'
import type { MembershipRequestFilters, MembershipRequestsResponse } from '../entities'

export interface UseMembershipRequestsV2Options {
  filters?: MembershipRequestFilters
  page?: number
  limit?: number
  enabled?: boolean
}

export function useMembershipRequestsV2(
  filters: MembershipRequestFilters = {},
  page: number = 1,
  limit: number = MEMBERSHIP_REQUEST_PAGINATION.DEFAULT_LIMIT,
  enabled: boolean = true
) {
  const repository = MembershipRepositoryV2.getInstance()

  return useQuery<MembershipRequestsResponse>({
    queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY, filters, page, limit],
    queryFn: () => repository.getAll(filters, page, limit),
    staleTime: MEMBERSHIP_REQUEST_CACHE.STALE_TIME_MS,
    gcTime: MEMBERSHIP_REQUEST_CACHE.GC_TIME_MS,
    enabled,
    refetchOnWindowFocus: false,
  })
}
