'use client'

import { useQuery } from '@tanstack/react-query'
import type { DashboardTabKey } from '../entities/dashboard-tabs.types'
import type { DashboardFilters } from '../entities/dashboard.types'
import {
  buildDashboardQueryKey,
  getDashboardFilterOptions,
  getDashboardSnapshot,
} from '../services/DashboardAggregationService'

export function useDashboard(activeTab: DashboardTabKey, filters: DashboardFilters) {
  return useQuery({
    queryKey: buildDashboardQueryKey(activeTab, filters),
    queryFn: () => getDashboardSnapshot(activeTab, filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useDashboardFilterOptions() {
  return useQuery({
    queryKey: ['dashboard', 'filter-options'],
    queryFn: getDashboardFilterOptions,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
