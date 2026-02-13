import type { DashboardTabKey } from './dashboard-tabs.types'

export type DashboardPeriodKey = 'today' | '7d' | '30d' | 'month' | 'custom'
export type DashboardMemberTypeFilter = 'all' | 'adherant' | 'bienfaiteur' | 'sympathisant'
export type DashboardModuleCompareFilter = 'all' | 'caisse' | 'credit' | 'placement'

export interface DashboardFilters {
  period: DashboardPeriodKey
  customFrom?: string
  customTo?: string
  memberType: DashboardMemberTypeFilter
  zoneProvince: string
  zoneCity: string
  moduleCompare: DashboardModuleCompareFilter
}

export interface DashboardFilterOptions {
  provinces: string[]
  citiesByProvince: Record<string, string[]>
}

export interface DashboardKpiItem {
  key: string
  label: string
  value: number
  format?: 'number' | 'currency' | 'percent'
  subtitle?: string
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
}

export interface DashboardDistributionItem {
  label: string
  value: number
}

export interface DashboardDistributionBlock {
  key: string
  title: string
  chartType?: 'bar' | 'pie'
  items: DashboardDistributionItem[]
}

export interface DashboardRankingItem {
  label: string
  value: number
  subLabel?: string
}

export interface DashboardRankingBlock {
  key: string
  title: string
  unit?: string
  items: DashboardRankingItem[]
}

export interface DashboardTabPayload {
  title: string
  subtitle?: string
  kpis: DashboardKpiItem[]
  distributions?: DashboardDistributionBlock[]
  rankings?: DashboardRankingBlock[]
  notes?: string[]
}

export interface DashboardSnapshot {
  generatedAt: string
  activeTab: DashboardTabKey
  source: 'live'
  stale: boolean
  snapshot: DashboardTabPayload
}

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  period: 'month',
  memberType: 'all',
  zoneProvince: 'all',
  zoneCity: 'all',
  moduleCompare: 'all',
}
