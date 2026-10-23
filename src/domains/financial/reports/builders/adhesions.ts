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
        makeLine('in_membership', 'Frais d’adhésion', membershipValues,
          'Frais payés à l’inscription d’un nouveau membre.'),
        makeLine('in_renewals', 'Renouvellements', renewalValues,
          'Renouvellements des adhésions arrivées à échéance.'),
        makeLine('in_others', 'Autres paiements', otherValues,
          'Autres paiements enregistrés sur les dossiers d’adhésion.'),
        makeLine('in_total', 'Total des entrées', total,
          'Tout l’argent reçu au titre des adhésions dans le mois.', { level: 'subtotal' }),
        makeLine('net', 'Solde du mois', total,
          'Les adhésions n’entraînent aucune sortie : le solde égale les entrées.', { level: 'total' }),
        makeLine('info_payments', 'Pour information : paiements enregistrés', flowValues(months, counts),
          'Nombre de paiements d’adhésion enregistrés dans le mois.', { unit: 'count', level: 'info' }),
      ]),
      makeBlock('result', [
        makeLine('income_membership', 'Produits : frais d’adhésion', membershipValues,
          'Les frais d’adhésion sont un gain pour l’association.'),
        makeLine('income_renewals', 'Produits : renouvellements', renewalValues,
          'Les renouvellements sont un gain pour l’association.'),
        makeLine('income_others', 'Produits : autres paiements', otherValues,
          'Autres paiements reçus sur les dossiers d’adhésion.'),
        makeLine('net', 'Résultat', total,
          'Ce que les adhésions ont rapporté dans le mois.', { level: 'total' }),
      ]),
    ],
    notes: [
      'Un paiement compte à sa date de versement. Les renouvellements sont lus dans les paiements du dossier d’adhésion, pas dans les abonnements, pour ne pas les compter deux fois.',
    ],
  }
}
