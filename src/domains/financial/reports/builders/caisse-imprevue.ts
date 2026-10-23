import type { FinancialReportModule } from '../entities/financial-report.types'
import type { FinancialReportContext, FinancialReportSources } from '../entities/financial-report-sources.types'
import { monthKeyOf } from '../utils/report-months'
import { addValues, flowValues, makeBlock, makeLine, stockValues, subtractValues, toNumber, type MonthAmount } from '../utils/report-lines'

const asArray = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value) ? value.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object') : []

const GRANTED_SUPPORT_STATUSES = new Set(['ACTIVE', 'REPAID'])

/**
 * Caisse imprévue : épargne mensuelle des membres, supports (avances
 * remboursables) et retraits. Le montant d'un versement est déjà net de la
 * part qui rembourse un support : cette part est lue sur le support.
 */
export function buildCaisseImprevueModule(sources: FinancialReportSources, context: FinancialReportContext): FinancialReportModule {
  const { months } = context
  const contributions: MonthAmount[] = []
  const penalties: MonthAmount[] = []
  const supportsGranted: MonthAmount[] = []
  const supportsRepaid: MonthAmount[] = []
  const refundsPaid: MonthAmount[] = []
  const refundsNominal: MonthAmount[] = []
  const bonuses: MonthAmount[] = []

  for (const payment of sources.caisseImprevuePayments) {
    const versements = asArray(payment.versements)
    if (versements.length > 0) {
      for (const versement of versements) {
        const month = monthKeyOf(versement.date ?? versement.createdAt)
        contributions.push({ month, amount: toNumber(versement.amount) })
        penalties.push({ month, amount: toNumber(versement.penalty) })
      }
    } else if (toNumber(payment.accumulatedAmount) > 0) {
      // Mois anciens sans détail des versements.
      contributions.push({ month: monthKeyOf(payment.updatedAt ?? payment.createdAt), amount: toNumber(payment.accumulatedAmount) })
    }
  }

  for (const support of sources.caisseImprevueSupports) {
    if (!GRANTED_SUPPORT_STATUSES.has(String(support.status))) continue
    supportsGranted.push({ month: monthKeyOf(support.approvedAt ?? support.createdAt), amount: toNumber(support.amount) })
    for (const repayment of asArray(support.repayments)) {
      supportsRepaid.push({ month: monthKeyOf(repayment.date ?? repayment.createdAt), amount: toNumber(repayment.amount) })
    }
  }

  for (const refund of sources.caisseImprevueRefunds) {
    if (refund.status !== 'PAID') continue
    const month = monthKeyOf(refund.withdrawalDate ?? refund.paidAt ?? refund.createdAt)
    const bonus = toNumber(refund.amountBonus)
    const paid = refund.withdrawalAmount != null
      ? toNumber(refund.withdrawalAmount)
      : toNumber(refund.amountNominal) + bonus
    refundsPaid.push({ month, amount: paid })
    refundsNominal.push({ month, amount: Math.max(0, paid - bonus) })
    bonuses.push({ month, amount: bonus })
  }

  const contributionValues = flowValues(months, contributions)
  const penaltyValues = flowValues(months, penalties)
  const repaidValues = flowValues(months, supportsRepaid)
  const grantedValues = flowValues(months, supportsGranted)
  const refundValues = flowValues(months, refundsPaid)
  const bonusValues = flowValues(months, bonuses)
  const inTotal = addValues(contributionValues, penaltyValues, repaidValues)
  const outTotal = addValues(grantedValues, refundValues)

  return {
    key: 'caisse_imprevue',
    title: 'Caisse imprévue',
    description: 'Épargne mensuelle des membres, supports accordés et retraits.',
    blocks: [
      makeBlock('treasury', [
        makeLine('in_contributions', 'Versements des membres', contributionValues),
        makeLine('in_penalties', 'Pénalités encaissées', penaltyValues),
        makeLine('in_supports_repaid', 'Remboursements de supports', repaidValues),
        makeLine('in_total', 'Total des entrées', inTotal, { level: 'subtotal' }),
        makeLine('out_supports', 'Supports accordés', grantedValues),
        makeLine('out_refunds', 'Retraits et remboursements versés', refundValues),
        makeLine('out_total', 'Total des sorties', outTotal, { level: 'subtotal' }),
        makeLine('net', 'Solde du mois', subtractValues(inTotal, outTotal), { level: 'total' }),
      ]),
      makeBlock('result', [
        makeLine('income_penalties', 'Produits : pénalités encaissées', penaltyValues),
        makeLine('charge_bonuses', 'Charges : bonus versés aux membres', bonusValues),
        makeLine('net', 'Résultat', subtractValues(penaltyValues, bonusValues), { level: 'total' }),
      ]),
      makeBlock('outstanding', [
        makeLine(
          'funds_held',
          'Épargne détenue pour les membres',
          subtractValues(stockValues(months, contributions), stockValues(months, refundsNominal)),
          { kind: 'stock' }
        ),
        makeLine(
          'supports_outstanding',
          'Supports à rembourser',
          subtractValues(stockValues(months, supportsGranted), stockValues(months, supportsRepaid)),
          { kind: 'stock' }
        ),
      ]),
    ],
    notes: [
      'Les versements sont une épargne à restituer : ils entrent en trésorerie mais ne sont pas un produit.',
      'Un support est une avance au membre : il sort à son approbation et rentre à chaque remboursement.',
      'Un support remboursé par déduction sur le remboursement final, sans remboursement enregistré, reste compté comme à rembourser.',
    ],
  }
}
