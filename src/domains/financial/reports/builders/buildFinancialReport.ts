import type { FinancialReport, MonthKey } from '../entities/financial-report.types'
import type { FinancialReportSources } from '../entities/financial-report-sources.types'
import { listMonths, monthLabel } from '../utils/report-months'
import { buildAdhesionsModule } from './adhesions'
import { buildCaisseImprevueModule } from './caisse-imprevue'
import { buildCaisseSpecialeModule } from './caisse-speciale'
import { buildCreditModule } from './credits'
import { buildPlacementsModule } from './placements'
import { buildSynthesisModule } from './synthesis'

/** Bilan financier de `from` à `to` (mois inclus), tous modules. */
export function buildFinancialReport(
  sources: FinancialReportSources,
  period: { from: MonthKey; to: MonthKey; now?: Date }
): FinancialReport {
  const now = period.now ?? new Date()
  const months = listMonths(period.from, period.to)
  const context = { months, now }

  const modules = [
    buildCaisseSpecialeModule(sources, context),
    buildCaisseImprevueModule(sources, context),
    buildCreditModule('SPECIALE', sources, context),
    buildCreditModule('FIXE', sources, context),
    buildCreditModule('AIDE', sources, context),
    buildPlacementsModule(sources, context),
    buildAdhesionsModule(sources, context),
  ]

  return {
    from: months[0] ?? period.from,
    to: months.at(-1) ?? period.to,
    months,
    monthLabels: months.map(monthLabel),
    generatedAt: now.toISOString(),
    modules: [buildSynthesisModule(modules, months.length), ...modules],
  }
}
