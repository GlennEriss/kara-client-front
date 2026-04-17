import { verifyAdminSessionFromRequest } from '@/domains/auth/server/session'
import { DEFAULT_DASHBOARD_FILTERS, type DashboardFilters } from '@/domains/dashboard/entities/dashboard.types'
import { getExecutiveActiveMembersPage } from '@/domains/dashboard/services/DashboardAggregationService'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

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
    const filters = normalizeFilters(body?.filters)
    const cursor = typeof body?.cursor === 'string' && body.cursor.trim() ? body.cursor : null
    const pageSize = typeof body?.pageSize === 'number' ? body.pageSize : 20

    const page = await getExecutiveActiveMembersPage(filters, cursor, pageSize)
    return NextResponse.json(page, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors du chargement des membres actifs'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
