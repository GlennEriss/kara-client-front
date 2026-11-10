import type { FinancialReportModule } from '../entities/financial-report.types'
import type { FinancialReportContext, FinancialReportSources } from '../entities/financial-report-sources.types'
import { monthKeyOf, toReportDate } from '../utils/report-months'
import { flowValues, makeBlock, makeLine, stockValues, subtractValues, toNumber, type MonthAmount } from '../utils/report-lines'

/** Une réception établit la part KARA et la dette envers le parrain.
 * Seule une remise datée enregistrée fait sortir l'argent, sans seconde charge. */
export function buildVehiclesModule(sources: FinancialReportSources, context: FinancialReportContext): FinancialReportModule {
  const receipts: MonthAmount[] = [], payments: MonthAmount[] = [], shares: MonthAmount[] = [], earnings: MonthAmount[] = []
  const expected = context.months.map(() => 0)
  const knownDate = (value: unknown) => {
    const date = toReportDate(value)
    return date && date <= context.now ? date : null
  }
  const money = (value: unknown) => Math.max(0, Math.round(toNumber(value)))
  for (const reward of sources.vehicleRewards ?? []) {
    const receipt = reward.partnerReceipt as Record<string, unknown> | undefined
    const payment = reward.memberPayment as Record<string, unknown> | undefined
    const receivedAt = knownDate(receipt?.receivedAt)
    const amount = money(receipt?.amount)
    const received = !!receivedAt && amount > 0
    const openedAt = knownDate(reward.createdAt ?? reward.startDate)
    const openedMonth = monthKeyOf(openedAt)
    const receiptMonth = received ? monthKeyOf(receivedAt) : null
    context.months.forEach((month, index) => {
      if (openedMonth && month >= openedMonth && (!receiptMonth || month < receiptMonth))
        expected[index] += money(reward.expectedCommission)
    })
    if (!receivedAt || amount <= 0) continue
    const share = money(reward.memberAmount)
    receipts.push({ month: receiptMonth, amount })
    shares.push({ month: receiptMonth, amount: share })
    earnings.push({ month: receiptMonth, amount: amount - share })
    const paidAt = knownDate(payment?.paidAt)
    // Un statut seul (PAID, TO_PAY...) ou une notification ne prouve aucune remise.
    if (paidAt && paidAt >= receivedAt) payments.push({ month: monthKeyOf(paidAt), amount: share })
  }
  const incoming = flowValues(context.months, receipts)
  const outgoing = flowValues(context.months, payments)
  return {
    key: 'vehicules',
    title: 'Véhicules — Assurances',
    description: 'Commissions reçues des assureurs, part de KARA et reversements confirmés aux parrains, par période assurée.',
    blocks: [
      makeBlock('treasury', [
        makeLine('in_total', 'Commissions reçues des assureurs', incoming, 'Montants réellement reçus, à la date de réception enregistrée.', { level: 'subtotal' }),
        makeLine('out_total', 'Reversements confirmés aux parrains', outgoing, 'Part remise au parrain, uniquement si la remise et sa date sont enregistrées dans Véhicules.', { level: 'subtotal' }),
        makeLine('net', 'Solde du mois', subtractValues(incoming, outgoing), 'Commissions reçues moins reversements confirmés. Ce solde comprend les parts des parrains encore détenues.', { level: 'total' }),
      ]),
      makeBlock('result', [
        makeLine('income_kara', 'Part acquise à KARA', flowValues(context.months, earnings), 'Commission effectivement reçue moins la part réservée au parrain, reconnue au mois de réception.'),
        makeLine('net', 'Résultat', flowValues(context.months, earnings), 'Seule la part de KARA constitue un gain. Le paiement ultérieur du parrain ne crée pas une seconde charge.', { level: 'total' }),
      ]),
      makeBlock('outstanding', [
        makeLine('sponsors_payable', 'Parts restant à reverser aux parrains', stockValues(context.months, [...shares, ...payments.map(event => ({ ...event, amount: -event.amount }))]), 'Parts réservées sur les commissions reçues, moins remises confirmées, depuis l’origine.', { kind: 'stock', level: 'subtotal' }),
        makeLine('expected_commissions', 'Prévision : commissions non encore reçues', expected, 'Estimation des périodes ouvertes sans réception à la fin du mois. Exclue de la trésorerie, du résultat et des créances de la synthèse.', { kind: 'stock', level: 'info' }),
      ]),
    ],
    notes: [
      'La prime d’assurance reste une information du dossier ; elle n’est ni une entrée de trésorerie ni une recette de KARA.',
      'Les commissions attendues sont des prévisions, jamais des gains encaissés. Le montant réellement reçu et la part du parrain enregistrée à sa réception font foi.',
      'Exemple : 20 000 FCFA reçus, dont 5 000 FCFA pour le parrain : résultat KARA 15 000 FCFA et dette de 5 000 FCFA. La remise confirmée sort 5 000 FCFA et solde cette dette, sans modifier le résultat.',
      'Les réceptions et remises suivent leurs dates effectives, même sur des mois différents. Un statut ou une notification sans remise datée ne déclenche aucune sortie.',
      'Chaque période et renouvellement est compté une seule fois. Les commissions des assureurs restent réservées à l’administration.',
    ],
  }
}
