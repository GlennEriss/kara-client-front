import type { FinancialReportModule, MonthKey } from '../entities/financial-report.types'
import type { FinancialReportSources } from '../entities/financial-report-sources.types'
import { monthKeyOf } from './report-months'

/** Dates qui marquent une opération : création d'un contrat, versement, sortie… */
const ACTIVITY_DATE_FIELDS = [
  'createdAt',
  'startDate',
  'firstPaymentDate',
  'disbursementDate',
  'date',
  'paymentDate',
  'paidAt',
  'recordedAt',
]

/** Un mois plus ancien est une donnée mal saisie, pas une opération. */
const OLDEST_ACTIVITY_MONTH = '2000-01'

/** Premier mois où le membre a une opération : début de « toute la période ». */
export function firstActivityMonth(sources: FinancialReportSources): MonthKey | null {
  let first: MonthKey | null = null
  const visit = (record: Record<string, unknown>) => {
    for (const field of ACTIVITY_DATE_FIELDS) {
      const month = monthKeyOf(record[field])
      if (month && month >= OLDEST_ACTIVITY_MONTH && (!first || month < first)) first = month
    }
  }
  for (const list of Object.values(sources) as Array<Array<Record<string, unknown>>>) {
    for (const record of list) {
      visit(record)
      // Les paiements d'adhésion sont rangés dans la demande.
      if (Array.isArray(record.payments)) {
        for (const payment of record.payments) if (payment && typeof payment === 'object') visit(payment as Record<string, unknown>)
      }
    }
  }
  return first
}

/** Module sans aucun montant ni compteur sur la période : le membre n'y a rien. */
export const isEmptyModule = (module: FinancialReportModule): boolean =>
  module.blocks.every((block) => block.lines.every((line) => line.values.every((value) => value === 0)))
