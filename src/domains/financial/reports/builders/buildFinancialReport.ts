import { FINANCIAL_REPORT_MAX_MONTHS, type FinancialReport, type FinancialReportSubject, type MonthKey } from '../entities/financial-report.types'
import type { FinancialReportSources } from '../entities/financial-report-sources.types'
import { isEmptyModule } from '../utils/member-report'
import { listMonths, monthLabel } from '../utils/report-months'
import { buildAdhesionsModule } from './adhesions'
import { buildCaisseImprevueModule } from './caisse-imprevue'
import { buildCaisseSpecialeModule } from './caisse-speciale'
import { buildCreditModule } from './credits'
import { buildPlacementsModule } from './placements'
import { buildSynthesisModule } from './synthesis'

/**
 * Bilan financier de `from` à `to` (mois inclus), tous modules. Avec un
 * `subject`, les sources ne portent que sur ce membre : ses modules vides sont
 * retirés, la synthèse ne reprend que ceux où il a une opération.
 */
export function buildFinancialReport(
  sources: FinancialReportSources,
  period: { from: MonthKey; to: MonthKey; now?: Date },
  options: { subject?: FinancialReportSubject; maxMonths?: number } = {}
): FinancialReport {
  const now = period.now ?? new Date()
  const months = listMonths(period.from, period.to, options.maxMonths ?? FINANCIAL_REPORT_MAX_MONTHS)
  const context = { months, now }

  const allModules = [
    buildCaisseSpecialeModule(sources, context),
    buildCaisseImprevueModule(sources, context),
    buildCreditModule('SPECIALE', sources, context),
    buildCreditModule('FIXE', sources, context),
    buildCreditModule('AIDE', sources, context),
    buildPlacementsModule(sources, context),
    buildAdhesionsModule(sources, context),
  ]
  const modules = options.subject ? allModules.filter((module) => !isEmptyModule(module)) : allModules
  const synthesis = buildSynthesisModule(modules, months.length)
  if (options.subject) {
    synthesis.description = `Vue d’ensemble des opérations de ${options.subject.name} (${options.subject.matricule}) avec l’association : trésorerie, résultat, encours et risques de ses contrats.`
  }

  return {
    ...(options.subject ? { subject: options.subject } : {}),
    from: months[0] ?? period.from,
    to: months.at(-1) ?? period.to,
    months,
    monthLabels: months.map(monthLabel),
    generatedAt: now.toISOString(),
    modules: [synthesis, ...modules],
  }
}
