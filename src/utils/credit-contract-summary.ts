import type { CreditContract, CreditPayment } from '@/types/types'
import {
  buildCreditSpecialeHistory,
  getCreditPaymentsForCurrentCycle,
} from './credit-speciale-history'
import { isFlatCredit, computeWeeklyCreditTotals } from './credit-weekly'
import { customRound } from './credit-speciale-calculations'

/** Same evolving schedule and current-cycle totals as the web contract detail. */
export function creditContractSummary(
  contract: CreditContract,
  payments: CreditPayment[],
) {
  const currentPayments = getCreditPaymentsForCurrentCycle(contract, payments)
  const simple =
    contract.creditType === 'FIXE' || contract.creditType === 'AIDE'
  const flat = isFlatCredit(contract)
  const history = simple
    ? []
    : buildCreditSpecialeHistory(contract, currentPayments, {
        projectUntilZero: true,
      })
  const paid =
    simple || flat
      ? currentPayments
          .filter(
            (p) =>
              p.amount > 0 ||
              !p.comment?.includes('Paiement de pénalités uniquement'),
          )
          .reduce((sum, p) => sum + p.amount, 0)
      : history
          .filter((r) => r.hasPaymentRecord)
          .reduce((sum, r) => sum + r.actualPayment, 0)
  const total = simple
    ? customRound(contract.totalAmount)
    : flat
      ? computeWeeklyCreditTotals(contract.amount, contract.interestRate)
          .totalAmount
      : history.reduce(
          (sum, r) =>
            sum +
            (r.isRest
              ? 0
              : r.hasPaymentRecord
                ? r.actualPayment
                : r.expectedPayment),
          0,
        )
  return {
    paid,
    total,
    remaining: simple || flat ? Math.max(0, total - paid) : total - paid,
    history,
    currentPayments,
  }
}
