import { NextRequest, NextResponse } from 'next/server'
import { mobileJson, requireMobileCaller } from '@/domains/mobile/server/access'
import { getDashboardSnapshot } from '@/domains/dashboard/services/DashboardAggregationService'
import { DEFAULT_DASHBOARD_FILTERS } from '@/domains/dashboard/entities/dashboard.types'
import type { DashboardPeriodKey } from '@/domains/dashboard/entities/dashboard.types'
import type { DashboardTabKey } from '@/domains/dashboard/entities/dashboard-tabs.types'

export const runtime = 'nodejs'
const tabs = ['executive', 'caisse_speciale', 'caisse_imprevue', 'credit_speciale', 'credit_fixe', 'caisse_aide', 'placements']
const periods = ['all', 'today', '7d', '30d', 'month']
export async function POST(request: NextRequest) {
  const caller = await requireMobileCaller(request, 'dashboard')
  if (caller instanceof NextResponse) return caller
  const body = await request.json().catch(() => null)
  if (!body || !tabs.includes(body.activeTab) || !periods.includes(body.period)) {
    return mobileJson({ error: 'L’activité ou la période demandée est invalide.' }, 400)
  }
  try {
    const snapshot = await getDashboardSnapshot(body.activeTab as DashboardTabKey, {
      ...DEFAULT_DASHBOARD_FILTERS, period: body.period as DashboardPeriodKey,
    })
    return mobileJson(snapshot)
  } catch {
    return mobileJson({ error: 'Impossible de charger les indicateurs. Réessayez.' }, 503)
  }
}
