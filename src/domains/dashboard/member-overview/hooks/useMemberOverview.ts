'use client'

import { useQuery } from '@tanstack/react-query'
import { MemberOverviewAggregationService } from '../services/MemberOverviewAggregationService'

const overviewService = MemberOverviewAggregationService.getInstance()

export function useMemberOverview(memberId?: string, enabled = true, limitPerSection = 8) {
  return useQuery({
    queryKey: ['dashboard', 'member-overview', memberId, limitPerSection],
    queryFn: () => overviewService.getMemberOverview(memberId!, limitPerSection),
    enabled: Boolean(memberId) && enabled,
    retry: 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
