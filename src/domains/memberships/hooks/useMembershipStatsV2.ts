/**
 * Hook React Query pour les statistiques des demandes d'adhésion V2
 * 
 * Utilise le Repository V2 avec getCountFromServer pour des statistiques correctes
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { MembershipRepositoryV2 } from '../repositories/MembershipRepositoryV2'
import { MEMBERSHIP_REQUEST_CACHE } from '@/constantes/membership-requests'
import type { MembershipStatistics } from '../entities'

export function useMembershipStatsV2() {
  const repository = MembershipRepositoryV2.getInstance()

  return useQuery<MembershipStatistics>({
    queryKey: [MEMBERSHIP_REQUEST_CACHE.STATS_QUERY_KEY],
    queryFn: () => repository.getStatistics(),
    staleTime: MEMBERSHIP_REQUEST_CACHE.STATS_STALE_TIME_MS,
    gcTime: MEMBERSHIP_REQUEST_CACHE.STATS_GC_TIME_MS,
    refetchOnWindowFocus: false,
  })
}
