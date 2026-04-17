'use client'

import { useQuery } from '@tanstack/react-query'
import { MemberGlobalSearchService } from '../services/MemberGlobalSearchService'

const searchService = MemberGlobalSearchService.getInstance()

export function useMemberGlobalSearch(query: string, enabled = true, limit = 8) {
  const normalized = query.trim()

  return useQuery({
    queryKey: ['dashboard', 'member-global-search', normalized, limit],
    queryFn: () => searchService.searchMembers(normalized, limit),
    enabled: enabled && normalized.length >= 2,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

