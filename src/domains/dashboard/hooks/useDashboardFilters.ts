'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_DASHBOARD_FILTERS,
  type DashboardFilters,
} from '../entities/dashboard.types'

const STORAGE_KEY = 'dashboard.filters.v1'

function sanitizeFilters(raw: Partial<DashboardFilters> | null | undefined): DashboardFilters {
  const safe = {
    ...DEFAULT_DASHBOARD_FILTERS,
    ...(raw || {}),
  }

  if (!safe.zoneProvince) safe.zoneProvince = 'all'
  if (!safe.zoneCity) safe.zoneCity = 'all'
  if (!safe.memberType) safe.memberType = 'all'
  if (!safe.moduleCompare) safe.moduleCompare = 'all'
  if (!safe.period) safe.period = 'month'

  if (safe.period !== 'custom') {
    safe.customFrom = undefined
    safe.customTo = undefined
  }

  return safe
}

export function useDashboardFilters() {
  const [filters, setFiltersState] = useState<DashboardFilters>(DEFAULT_DASHBOARD_FILTERS)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw) as Partial<DashboardFilters>
      setFiltersState(sanitizeFilters(parsed))
    } catch {
      setFiltersState(DEFAULT_DASHBOARD_FILTERS)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  }, [filters])

  const setFilters = (updater: DashboardFilters | ((prev: DashboardFilters) => DashboardFilters)) => {
    setFiltersState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return sanitizeFilters(next)
    })
  }

  const resetFilters = () => {
    setFiltersState(DEFAULT_DASHBOARD_FILTERS)
  }

  const hasActiveMemberScope = useMemo(
    () => filters.memberType !== 'all' || filters.zoneProvince !== 'all' || filters.zoneCity !== 'all',
    [filters.memberType, filters.zoneProvince, filters.zoneCity]
  )

  return {
    filters,
    setFilters,
    resetFilters,
    hasActiveMemberScope,
  }
}
