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
  // Pour compatibilité avec l'ancienne interface
  goToNextPage: () => void
  goToPrevPage: () => void
  canGoNext: boolean
  canGoPrev: boolean
}

const MEMBERS_LIST_CACHE_KEY = 'memberships-list-v2'

export function useMembershipsListV2(
  options: UseMembershipsListV2Options = {},
): UseMembershipsListV2Result {
  const {
    filters: baseFilters = {},
    page = 1,
    limit = 10,
    tab,
    enabled = true,
  } = options

  const repository = MembersRepositoryV2.getInstance()

  // Construire les filtres effectifs en fonction de l'onglet
  const effectiveFilters = useMemo(
    () => MembershipsListService.buildFiltersForTab(baseFilters, tab),
    [baseFilters, tab],
  )

  // Clé de cache unique pour cette combinaison de paramètres
  const queryKey = useMemo(
    () => [MEMBERS_LIST_CACHE_KEY, effectiveFilters, page, limit, tab],
    [effectiveFilters, page, limit, tab],
  )

  // Requête principale
  const query = useQuery<PaginatedMembers>({
    queryKey,
    queryFn: () => repository.getAll(effectiveFilters, page, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    enabled,
    refetchOnWindowFocus: false,
  })

  // Calculer les statistiques
  const stats = useMemo(
    () => MembershipsListService.calculateStats(query.data ?? null),
    [query.data],
  )

  // Valeurs pour compatibilité (non utilisées, la pagination est gérée par le parent)
  const canGoNext = query.data?.pagination.hasNextPage ?? false
  const canGoPrev = page > 1

  return {
    data: query.data,
    stats,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    goToNextPage: () => {}, // Non utilisé - géré par MembershipsListPage
    goToPrevPage: () => {}, // Non utilisé - géré par MembershipsListPage
    canGoNext,
    canGoPrev,
  }
}

