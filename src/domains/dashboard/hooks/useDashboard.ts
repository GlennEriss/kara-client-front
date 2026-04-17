'use client'

import { useQuery } from '@tanstack/react-query'
import type { DashboardTabKey } from '../entities/dashboard-tabs.types'
import type { DashboardFilterOptions, DashboardFilters, DashboardSnapshot } from '../entities/dashboard.types'
import { buildDashboardQueryKey } from '../services/DashboardAggregationService'

async function fetchDashboardSnapshot(activeTab: DashboardTabKey, filters: DashboardFilters): Promise<DashboardSnapshot> {
  const response = await fetch('/api/dashboard/snapshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activeTab, filters }),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || 'Impossible de charger le dashboard')
  }

  return response.json() as Promise<DashboardSnapshot>
}

async function fetchDashboardFilterOptions(): Promise<DashboardFilterOptions> {
  const response = await fetch('/api/dashboard/filter-options', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || 'Impossible de charger les filtres dashboard')
  }

  return response.json() as Promise<DashboardFilterOptions>
}

export function useDashboard(activeTab: DashboardTabKey, filters: DashboardFilters) {
  return useQuery({
    queryKey: buildDashboardQueryKey(activeTab, filters),
    queryFn: () => fetchDashboardSnapshot(activeTab, filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useDashboardFilterOptions() {
  return useQuery({
    queryKey: ['dashboard', 'filter-options'],
    queryFn: fetchDashboardFilterOptions,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
