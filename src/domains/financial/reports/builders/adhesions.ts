import type { FinancialReportModule } from '../entities/financial-report.types'
import type { FinancialReportContext, FinancialReportSources } from '../entities/financial-report-sources.types'
import { monthKeyOf } from '../utils/report-months'
import { addValues, flowValues, makeBlock, makeLine, toNumber, type MonthAmount } from '../utils/report-lines'

/**
 * Adhésions : frais d'adhésion et renouvellements, lus dans les paiements des
 * demandes d'adhésion (un renouvellement y est aussi enregistré).
 */
export function buildAdhesionsModule(sources: FinancialReportSources, context: FinancialReportContext): FinancialReportModule {
  const { months } = context
  const membership: MonthAmount[] = []
  const renewals: MonthAmount[] = []
  const others: MonthAmount[] = []
  const counts: MonthAmount[] = []

  for (const request of sources.membershipRequests) {
    const payments = Array.isArray(request.payments) ? (request.payments as Array<Record<string, unknown>>) : []
    for (const payment of payments) {
      if (!payment || typeof payment !== 'object') continue
      const event = { month: monthKeyOf(payment.date ?? payment.recordedAt), amount: toNumber(payment.amount) }
      if (payment.paymentType === 'Membership') membership.push(event)
      else if (payment.paymentType === 'Subscription') renewals.push(event)
      else others.push(event)
      counts.push({ month: event.month, amount: 1 })
    }
  }

  const membershipValues = flowValues(months, membership)
  const renewalValues = flowValues(months, renewals)
  const otherValues = flowValues(months, others)
  const total = addValues(membershipValues, renewalValues, otherValues)

  return {
    key: 'adhesions',
    title: 'Adhésions',
    description: 'Frais d’adhésion et renouvellements encaissés.',
    blocks: [
      makeBlock('treasury', [
        makeLine('in_membership', 'Frais d’adhésion', membershipValues),
        makeLine('in_renewals', 'Renouvellements', renewalValues),
        makeLine('in_others', 'Autres paiements', otherValues),
        makeLine('in_total', 'Total des entrées', total, { level: 'subtotal' }),
        makeLine('net', 'Solde du mois', total, { level: 'total' }),
        makeLine('info_payments', 'Pour information : paiements enregistrés', flowValues(months, counts), { unit: 'count', level: 'info' }),
      ]),
      makeBlock('result', [
        makeLine('income_membership', 'Produits : frais d’adhésion', membershipValues),
        makeLine('income_renewals', 'Produits : renouvellements', renewalValues),
        makeLine('income_others', 'Produits : autres paiements', otherValues),
        makeLine('net', 'Résultat', total, { level: 'total' }),
      ]),
    ],
    notes: [
      'Un paiement compte à sa date de versement. Les renouvellements sont lus dans les paiements du dossier d’adhésion, pas dans les abonnements, pour ne pas les compter deux fois.',
    ],
  }
}
