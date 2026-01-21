'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { UserFilters } from '@/types/types'
import type { PaginatedMembers } from '@/db/member.db'
import { MembersRepositoryV2 } from '../repositories/MembersRepositoryV2'
import {
  MembershipsListService,
  type MembersTab,
  type MembershipStats,
} from '../services/MembershipsListService'

export interface UseMembershipsListV2Options {
  filters?: UserFilters
  page?: number
  limit?: number
  tab?: MembersTab
  enabled?: boolean
}

export interface UseMembershipsListV2Result {
  data: PaginatedMembers | undefined
  stats: MembershipStats | null
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => Promise<unknown>
}

const MEMBERS_LIST_CACHE_KEY = 'memberships-list-v2'

export function useMembershipsListV2(
  options: UseMembershipsListV2Options = {},
): UseMembershipsListV2Result {
  const {
    filters: baseFilters = {},
    page = 1,
    limit = 12,
    tab,
    enabled = true,
  } = options

  const repository = MembersRepositoryV2.getInstance()

  const effectiveFilters = useMemo(
    () => MembershipsListService.buildFiltersForTab(baseFilters, tab),
    [baseFilters, tab],
  )

  const query = useQuery<PaginatedMembers>({
    queryKey: [MEMBERS_LIST_CACHE_KEY, effectiveFilters, page, limit],
    queryFn: () => repository.getAll(effectiveFilters, page, limit),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled,
    refetchOnWindowFocus: false,
  })

  const stats = useMemo(
    () => MembershipsListService.calculateStats(query.data ?? null),
    [query.data],
  )

  return {
    data: query.data,
    stats,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

