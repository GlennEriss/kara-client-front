import { verifyAdminSessionFromRequest } from '@/domains/auth/server/session'
import { DASHBOARD_TAB_KEYS, DEFAULT_DASHBOARD_TAB, type DashboardTabKey } from '@/domains/dashboard/entities/dashboard-tabs.types'
import { DEFAULT_DASHBOARD_FILTERS, type DashboardFilters } from '@/domains/dashboard/entities/dashboard.types'
import { getDashboardSnapshot } from '@/domains/dashboard/services/DashboardAggregationService'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

function isDashboardTabKey(value: unknown): value is DashboardTabKey {
  return typeof value === 'string' && DASHBOARD_TAB_KEYS.includes(value as DashboardTabKey)
}

function normalizeFilters(raw: unknown): DashboardFilters {
  if (!raw || typeof raw !== 'object') return DEFAULT_DASHBOARD_FILTERS

  const filters = raw as Partial<DashboardFilters>
  return {
    ...DEFAULT_DASHBOARD_FILTERS,
    ...filters,
    period: filters.period ?? DEFAULT_DASHBOARD_FILTERS.period,
    memberType: filters.memberType ?? DEFAULT_DASHBOARD_FILTERS.memberType,
    zoneProvince: filters.zoneProvince ?? DEFAULT_DASHBOARD_FILTERS.zoneProvince,
    zoneCity: filters.zoneCity ?? DEFAULT_DASHBOARD_FILTERS.zoneCity,
    moduleCompare: filters.moduleCompare ?? DEFAULT_DASHBOARD_FILTERS.moduleCompare,
  }
}

export async function POST(request: NextRequest) {
  const claims = await verifyAdminSessionFromRequest(request)
  if (!claims) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const activeTab = isDashboardTabKey(body?.activeTab) ? body.activeTab : DEFAULT_DASHBOARD_TAB
    const filters = normalizeFilters(body?.filters)

    const snapshot = await getDashboardSnapshot(activeTab, filters)
    return NextResponse.json(snapshot, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la génération du dashboard'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

