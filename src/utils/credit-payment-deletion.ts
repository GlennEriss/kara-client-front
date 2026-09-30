import type { CreditContract, CreditPayment } from '@/types/types'
import {
  getCreditPaymentCycleNumber,
  getCreditPaymentMonthNumber,
  getCreditPaymentsForCurrentCycle,
  getCreditSpecialeLastRecordedMonth,
  getCurrentCreditContractCycle,
} from './credit-speciale-history'
import { isWeeklyCredit } from './credit-weekly'

/** Statuts où un paiement peut encore être supprimé (contrat en cours de remboursement). */
export const DELETABLE_PAYMENT_CONTRACT_STATUSES: CreditContract['status'][] = ['ACTIVE', 'PARTIAL', 'OVERDUE', 'BLOCKED']

/**
 * Motif de refus de suppression d'un paiement, ou `null` si elle est permise.
 *
 * Seul le dernier mois enregistré du cycle en cours peut être supprimé : le
 * capital, les intérêts et les pénalités de chaque mois dépendent des paiements
 * précédents, un trou au milieu de l'échéancier fausserait tout ce qui suit.
 * Pour corriger un mois plus ancien, on supprime à rebours.
 */
export function getCreditPaymentDeletionBlocker(
  contract: CreditContract,
  payments: CreditPayment[],
  payment: CreditPayment
): string | null {
  if (!DELETABLE_PAYMENT_CONTRACT_STATUSES.includes(contract.status)) {
    return 'Le contrat est soldé, clôturé ou transformé : ses paiements ne peuvent plus être supprimés.'
  }

  const currentCycleNumber = getCurrentCreditContractCycle(contract).cycleNumber
  if (getCreditPaymentCycleNumber(contract, payment) !== currentCycleNumber) {
    return 'Ce paiement appartient à un cycle antérieur au rajout : il ne peut plus être supprimé.'
  }

  const cyclePayments = getCreditPaymentsForCurrentCycle(contract, payments)
  const lastRecordedMonth = getCreditSpecialeLastRecordedMonth(contract, cyclePayments)
  const month = getCreditPaymentMonthNumber(contract, payment)
  if (month !== lastRecordedMonth) {
    return `Seul le dernier mois enregistré (M${lastRecordedMonth}) peut être supprimé. Supprimez les paiements dans l'ordre inverse.`
  }

  // Crédit en semaines : plusieurs versements possibles sur l'échéance unique ;
  // seul le plus récent se supprime.
  if (isWeeklyCredit(contract)) {
    const latest = [...cyclePayments]
      .filter((other) => getCreditPaymentMonthNumber(contract, other) === month)
      .sort((left, right) => new Date(right.paymentDate).getTime() - new Date(left.paymentDate).getTime())[0]
    if (latest && latest.id !== payment.id) {
      return 'Seul le dernier versement de l’échéance peut être supprimé. Supprimez les versements dans l’ordre inverse.'
    }
  }

  return null
}
