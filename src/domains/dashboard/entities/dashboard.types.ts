import type { DashboardTabKey } from './dashboard-tabs.types'

export type DashboardPeriodKey = 'all' | 'today' | '7d' | '30d' | 'month' | 'custom'
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
  href?: string
}

export interface DashboardDistributionItem {
  label: string
  value: number
}

export interface DashboardDistributionBlock {
  key: string
  title: string
  chartType?: 'bar' | 'pie'
  unit?: string
  items: DashboardDistributionItem[]
}

export interface DashboardRankingItem {
  label: string
  value: number
  subLabel?: string
  href?: string
}

export interface ExecutiveActiveMemberItem {
  memberId: string
  label: string
  value: number
  subLabel?: string
  href?: string
}

export interface ExecutiveActiveMembersPage {
  items: ExecutiveActiveMemberItem[]
  pageSize: number
  nextCursor: string | null
  hasNextPage: boolean
}

export interface DashboardRankingBlock {
  key: string
  title: string
  unit?: string
  items: DashboardRankingItem[]
}

export interface DashboardFinancialLine {
  key: string
  label: string
  value: number
  format?: 'number' | 'currency' | 'percent'
  description?: string
  tone?: DashboardKpiItem['tone']
  href?: string
}

export interface DashboardFinancialSection {
  key: string
  title: string
  description: string
  lines: DashboardFinancialLine[]
}

export interface DashboardTabPayload {
  title: string
  subtitle?: string
  kpis: DashboardKpiItem[]
  distributions?: DashboardDistributionBlock[]
  rankings?: DashboardRankingBlock[]
  financialSections?: DashboardFinancialSection[]
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
  period: 'all',
  memberType: 'all',
  zoneProvince: 'all',
  zoneCity: 'all',
  moduleCompare: 'all',
}
