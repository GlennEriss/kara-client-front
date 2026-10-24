import { requireAdminCaller } from '@/domains/auth/server/requireAdminCaller'
import { buildFinancialReport } from '@/domains/financial/reports/builders/buildFinancialReport'
import { MEMBER_FINANCIAL_REPORT_MAX_MONTHS } from '@/domains/financial/reports/entities/financial-report.types'
import { loadMemberFinancialReportSources } from '@/domains/financial/reports/services/loadMemberFinancialReportSources'
import { firstActivityMonth } from '@/domains/financial/reports/utils/member-report'
import { addMonthsToKey, currentMonthKey, isMonthKey } from '@/domains/financial/reports/utils/report-months'
import { adminFirestore } from '@/firebase/adminFirestore'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Bilan financier d'un membre : `memberId`, puis `from` et `to` (mois
 * `YYYY-MM` inclus) ou `all=1` pour toute la période, du premier mois où il a
 * une opération jusqu'au mois en cours. Réservé au SuperAdmin.
 */
export async function GET(request: NextRequest) {
  const caller = await requireAdminCaller(request, { superAdmin: true })
  if (caller instanceof NextResponse) return caller

  if (!adminFirestore) {
    return NextResponse.json({ error: 'Base de données indisponible' }, { status: 503 })
  }

  const params = request.nextUrl.searchParams
  const memberId = params.get('memberId')?.trim()
  if (!memberId) {
    return NextResponse.json({ error: 'Choisissez un membre' }, { status: 400 })
  }
  const isWholeHistory = params.get('all') === '1'
  const from = params.get('from')
  const to = params.get('to')
  if (!isWholeHistory && (!isMonthKey(from) || !isMonthKey(to))) {
    return NextResponse.json({ error: 'Période invalide : mois attendus au format AAAA-MM' }, { status: 400 })
  }

  try {
    const loaded = await loadMemberFinancialReportSources(adminFirestore, memberId)
    if (!loaded) {
      return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })
    }

    const current = currentMonthKey()
    // Pas de mois futur : rien n'y est encore enregistré.
    const end = isWholeHistory || (to as string) > current ? current : (to as string)
    const oldest = addMonthsToKey(end, -(MEMBER_FINANCIAL_REPORT_MAX_MONTHS - 1))
    let start: string
    if (isWholeHistory) {
      const first = firstActivityMonth(loaded.sources) ?? end
      start = first < oldest ? oldest : first > end ? end : first
    } else {
      start = from as string
      if (start > end) {
        return NextResponse.json({ error: 'Le mois de début doit précéder le mois de fin' }, { status: 400 })
      }
      if (start < oldest) {
        return NextResponse.json(
          { error: `La période ne peut pas dépasser ${MEMBER_FINANCIAL_REPORT_MAX_MONTHS} mois` },
          { status: 400 }
        )
      }
    }

    const report = buildFinancialReport(
      loaded.sources,
      { from: start, to: end },
      { subject: loaded.subject, maxMonths: MEMBER_FINANCIAL_REPORT_MAX_MONTHS }
    )
    return NextResponse.json(report, { status: 200 })
  } catch (error) {
    console.error('[financial-reports/member] génération impossible:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération du bilan du membre' }, { status: 500 })
  }
}
