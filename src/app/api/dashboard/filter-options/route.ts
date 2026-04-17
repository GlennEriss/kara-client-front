import { verifyAdminSessionFromRequest } from '@/domains/auth/server/session'
import { getDashboardFilterOptions } from '@/domains/dashboard/services/DashboardAggregationService'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const claims = await verifyAdminSessionFromRequest(request)
  if (!claims) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
  }

  try {
    const options = await getDashboardFilterOptions()
    return NextResponse.json(options, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors du chargement des filtres dashboard'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

