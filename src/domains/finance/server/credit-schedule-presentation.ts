import type {
  CreditContract,
  CreditInstallment,
  CreditPayment,
} from '@/types/types'
import { creditContractSummary } from '@/utils/credit-contract-summary'
import { buildSimpleCreditSchedule } from '@/utils/credit-losses'
import {
  computeWeeklyCreditTotals,
  getFlatInstallmentCount,
  isFlatCredit,
  splitFlatInstallments,
} from '@/utils/credit-weekly'
import { getCreditPaymentMonthNumber } from '@/utils/credit-speciale-history'

/** Enrichit l’échéancier mobile avec les mêmes projections que la fiche web. */
export function presentCreditInstallments(
  contract: CreditContract,
  payments: CreditPayment[],
  installments: CreditInstallment[],
  sourcePayments: CreditPayment[] = payments,
) {
  const totals = creditContractSummary(contract, payments)
  const simple =
    contract.creditType === 'FIXE' || contract.creditType === 'AIDE'
  const simpleRows = simple
    ? buildSimpleCreditSchedule(contract, totals.currentPayments)
    : []
  const flat = isFlatCredit(contract)
  const flatAmounts = flat
    ? splitFlatInstallments(
        computeWeeklyCreditTotals(contract.amount, contract.interestRate)
          .totalAmount,
        getFlatInstallmentCount(contract),
      )
    : []
  return installments.map((row) => {
    const projection = simpleRows.find((p) => p.month === row.installmentNumber)
    const special = totals.history.find(
      (p) => !p.isRest && p.month === row.installmentNumber,
    )
    const recorded = totals.currentPayments.filter(
      (p) =>
        getCreditPaymentMonthNumber(contract, p) === row.installmentNumber &&
        (p.amount > 0 ||
          !p.comment?.includes('Paiement de pénalités uniquement')),
    )
    return {
      ...row,
      capitalAmount: special?.capitalStart ?? null,
      globalAmount: flat
        ? (flatAmounts[row.installmentNumber - 1] ?? special?.amountDue)
        : (special?.amountDue ?? projection?.principal ?? null),
      paymentIds: recorded.map((p) => p.id),
      recordedPayments: recorded.map((p) => {
        const source = sourcePayments.find((item) => item.id === p.id) || p
        return {
          id: p.id,
          amount: p.amount,
          date: source.paymentDate,
          time: p.paymentTime || null,
          mode: p.mode || null,
          modificationReason: p.modificationReason || null,
          updatedAt: source.updatedAt || null,
        }
      }),
    }
  })
}
