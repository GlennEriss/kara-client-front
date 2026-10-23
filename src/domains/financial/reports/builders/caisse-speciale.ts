import type { FinancialReportModule } from '../entities/financial-report.types'
import type { FinancialReportContext, FinancialReportSources } from '../entities/financial-report-sources.types'
import { monthKeyOf } from '../utils/report-months'
import { addValues, flowValues, makeBlock, makeLine, stockValues, subtractValues, toNumber, type MonthAmount } from '../utils/report-lines'

const asArray = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value) ? value.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object') : []

/**
 * Caisse spéciale : l'épargne des membres. Les versements sont des fonds
 * détenus pour le membre, pas un gain ; seules les pénalités sont un produit
 * et les bonus versés au remboursement une charge.
 */
export function buildCaisseSpecialeModule(sources: FinancialReportSources, context: FinancialReportContext): FinancialReportModule {
  const { months } = context
  const contributions: MonthAmount[] = []
  const penalties: MonthAmount[] = []
  const refundsPaid: MonthAmount[] = []
  const refundsNominal: MonthAmount[] = []
  const bonuses: MonthAmount[] = []

  for (const payment of sources.caisseSpecialePayments) {
    // Un versement se lit dans ses contributions (journalière, libre, groupe) ;
    // sinon c'est un versement unique, compté une fois payé.
    const contribs = asArray(payment.contribs)
    const groupContributions = asArray(payment.groupContributions)
    if (contribs.length > 0 || groupContributions.length > 0) {
      for (const contribution of [...contribs, ...groupContributions]) {
        const month = monthKeyOf(contribution.paidAt ?? contribution.createdAt ?? payment.paidAt)
        contributions.push({ month, amount: toNumber(contribution.amount) })
        penalties.push({ month, amount: toNumber(contribution.penalty) })
      }
    } else if (payment.status === 'PAID') {
      const month = monthKeyOf(payment.paidAt)
      contributions.push({ month, amount: toNumber(payment.amount) })
      penalties.push({ month, amount: toNumber(payment.penaltyApplied) })
    }
  }

  // Un remboursement « archivé » a été annulé : seuls les remboursements payés comptent.
  for (const refund of sources.caisseSpecialeRefunds) {
    if (refund.status !== 'PAID') continue
    const month = monthKeyOf(refund.withdrawalDate ?? refund.processedAt ?? refund.createdAt)
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
  const refundValues = flowValues(months, refundsPaid)
  const bonusValues = flowValues(months, bonuses)
  const inTotal = addValues(contributionValues, penaltyValues)

  return {
    key: 'caisse_speciale',
    title: 'Caisse spéciale',
    description: 'Épargne des membres : versements reçus, remboursements et fonds détenus.',
    blocks: [
      makeBlock('treasury', [
        makeLine('in_contributions', 'Versements des membres', contributionValues,
          'Sommes versées par les membres sur leurs contrats de caisse spéciale (cotisations mensuelles, journalières ou libres).'),
        makeLine('in_penalties', 'Pénalités encaissées', penaltyValues,
          'Pénalités payées par les membres pour des versements en retard.'),
        makeLine('in_total', 'Total des entrées', inTotal,
          'Tout l’argent reçu par la caisse spéciale dans le mois.', { level: 'subtotal' }),
        makeLine('out_refunds', 'Remboursements et retraits versés', refundValues,
          'Épargne rendue aux membres : remboursements en fin de contrat et retraits anticipés, bonus compris.'),
        makeLine('out_total', 'Total des sorties', refundValues,
          'Tout l’argent sorti de la caisse spéciale dans le mois.', { level: 'subtotal' }),
        makeLine('net', 'Solde du mois', subtractValues(inTotal, refundValues),
          'Entrées moins sorties. Positif : la caisse a reçu plus qu’elle n’a rendu.', { level: 'total' }),
      ]),
      makeBlock('result', [
        makeLine('income_penalties', 'Produits : pénalités encaissées', penaltyValues,
          'Les pénalités de retard sont un gain pour l’association.'),
        makeLine('charge_bonuses', 'Charges : bonus versés aux membres', bonusValues,
          'Bonus ajoutés à l’épargne des membres au moment du remboursement : un coût pour l’association.'),
        makeLine('net', 'Résultat', subtractValues(penaltyValues, bonusValues),
          'Pénalités moins bonus : ce que la caisse spéciale a rapporté à l’association.', { level: 'total' }),
      ]),
      makeBlock('outstanding', [
        makeLine(
          'funds_held',
          'Épargne détenue pour les membres',
          subtractValues(stockValues(months, contributions), stockValues(months, refundsNominal)),
          'Épargne que l’association garde pour les membres et devra leur rendre : tous les versements depuis l’ouverture des contrats, moins ce qui a déjà été remboursé.',
          { kind: 'stock', level: 'total' }
        ),
      ]),
    ],
    notes: [
      'Les versements des membres sont une épargne à leur restituer : ils entrent en trésorerie mais ne sont pas un produit.',
      'Un remboursement compte à sa date de retrait, une fois payé ; les remboursements annulés sont ignorés.',
      'L’épargne détenue cumule tous les versements depuis l’ouverture des contrats, moins la part nominale remboursée.',
    ],
  }
}
