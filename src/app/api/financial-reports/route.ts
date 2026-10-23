import { requireAdminCaller } from '@/domains/auth/server/requireAdminCaller'
import { buildFinancialReport } from '@/domains/financial/reports/builders/buildFinancialReport'
import { FINANCIAL_REPORT_MAX_MONTHS } from '@/domains/financial/reports/entities/financial-report.types'
import { loadFinancialReportSources } from '@/domains/financial/reports/services/loadFinancialReportSources'
import { addMonthsToKey, currentMonthKey, isMonthKey } from '@/domains/financial/reports/utils/report-months'
import { adminFirestore } from '@/firebase/adminFirestore'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/** Bilan financier de `from` à `to` (mois `YYYY-MM` inclus). Réservé au SuperAdmin. */
export async function GET(request: NextRequest) {
  const caller = await requireAdminCaller(request, { superAdmin: true })
  if (caller instanceof NextResponse) return caller

  if (!adminFirestore) {
    return NextResponse.json({ error: 'Base de données indisponible' }, { status: 503 })
  }

  const from = request.nextUrl.searchParams.get('from')
  const to = request.nextUrl.searchParams.get('to')
  if (!isMonthKey(from) || !isMonthKey(to)) {
    return NextResponse.json({ error: 'Période invalide : mois attendus au format AAAA-MM' }, { status: 400 })
  }
  // Pas de mois futur : rien n'y est encore enregistré.
  const end = to > currentMonthKey() ? currentMonthKey() : to
  if (from > end) {
    return NextResponse.json({ error: 'Le mois de début doit précéder le mois de fin' }, { status: 400 })
  }
  if (from < addMonthsToKey(end, -(FINANCIAL_REPORT_MAX_MONTHS - 1))) {
    return NextResponse.json({ error: `La période ne peut pas dépasser ${FINANCIAL_REPORT_MAX_MONTHS} mois` }, { status: 400 })
  }

  try {
    const sources = await loadFinancialReportSources(adminFirestore)
    return NextResponse.json(buildFinancialReport(sources, { from, to: end }), { status: 200 })
  } catch (error) {
    console.error('[financial-reports] génération impossible:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération du bilan' }, { status: 500 })
  }
}
