import type { CreditContract, CreditPayment } from '@/types/types'
import { addContractMonths } from './contract-months'
import { customRound } from './credit-speciale-calculations'
import {
  buildCreditSpecialeHistory,
  getCreditPaymentMonthNumber,
  getCreditPaymentsForCurrentCycle,
} from './credit-speciale-history'

/**
 * Manque à gagner d'un crédit : les intérêts que le KARA ne perçoit pas.
 * - Crédit spécial : en partie fixe, chaque mois où il reste du capital
 *   (capital × taux mensuel).
 * - Crédit fixe / aide : après la durée contractuelle, tant qu'il reste à payer
 *   (10 % du reste dû par mois).
 * Même calcul que l'onglet « Manque à gagner » du contrat.
 */

/** Taux mensuel de perte d'un crédit fixe / aide après la durée contractuelle. */
export const SIMPLE_CREDIT_LOSS_RATE = 0.1

export interface SimpleCreditScheduleItem {
  month: number
  date: Date
  payment: number
  interest: number
  principal: number
  remaining: number
  status: 'PAID' | 'DUE' | 'FUTURE'
  paidAmount?: number
  paymentDate?: Date
  paymentTime?: string
}

/** Versements de mensualité (y compris un versement de 0 FCFA explicite). */
function isScheduledPayment(payment: CreditPayment): boolean {
  return (
    payment.amount > 0 ||
    !!payment.comment?.includes('Paiement de 0 FCFA') ||
    (!payment.comment?.includes('Paiement de pénalités uniquement') && payment.amount === 0)
  )
}

function paymentsByMonth(contract: CreditContract, payments: CreditPayment[]): Map<number, number> {
  const totals = new Map<number, number>()
  for (const payment of payments.filter(isScheduledPayment)) {
    const month = getCreditPaymentMonthNumber(contract, payment)
    totals.set(month, (totals.get(month) || 0) + payment.amount)
  }
  return totals
}

function monthHasPayment(contract: CreditContract, payments: CreditPayment[], month: number): boolean {
  return payments
    .filter(isScheduledPayment)
    .some((payment) => getCreditPaymentMonthNumber(contract, payment) === month)
}

/**
 * Échéancier réel d'un crédit fixe / aide (intérêt unique, pas d'intérêt
 * mensuel) : versements enregistrés, puis échéances théoriques.
 */
export function buildSimpleCreditSchedule(
  contract: CreditContract,
  paymentsForSchedule: CreditPayment[],
): SimpleCreditScheduleItem[] {
  const firstDate = new Date(contract.firstPaymentDate)
  const maxDuration = contract.duration
  const defaultMonthlyPayment = contract.monthlyPaymentAmount
  const hasCustomSchedule = contract.customSchedule && contract.customSchedule.length > 0

  const customPaymentByMonth = new Map<number, number>()
  if (hasCustomSchedule) {
    contract.customSchedule!.forEach((entry) => {
      customPaymentByMonth.set(entry.month, entry.amount)
    })
  }

  const items: SimpleCreditScheduleItem[] = []
  const paymentsByMonthMap = paymentsByMonth(contract, paymentsForSchedule)

  const sortedPayments = [...paymentsForSchedule]
    .filter(
      (p) =>
        p.amount > 0 ||
        p.comment?.includes('Paiement de 0 FCFA') ||
        (!p.comment?.includes('Paiement de pénalités uniquement') && p.amount === 0)
    )
    .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime())

  const totalAmount = customRound(contract.totalAmount)
  const plannedDuration = hasCustomSchedule
    ? Math.max(maxDuration, ...contract.customSchedule!.map((entry, index) => entry.month || index + 1))
    : Math.max(1, maxDuration)

  let currentRemaining = totalAmount
  let monthIndex = 0

  while (currentRemaining > 0 && monthIndex < 20) {
    const currentMonth = monthIndex + 1
    const date = addContractMonths(firstDate, monthIndex)

    let plannedPayment = hasCustomSchedule
      ? (customPaymentByMonth.get(currentMonth) ?? defaultMonthlyPayment)
      : defaultMonthlyPayment

    if (!hasCustomSchedule && currentMonth <= plannedDuration) {
      const basePayment = Math.floor(totalAmount / plannedDuration)
      if (currentMonth < plannedDuration) {
        plannedPayment = basePayment
      } else if (currentMonth === plannedDuration) {
        const alreadyPlanned = basePayment * (plannedDuration - 1)
        plannedPayment = Math.max(0, totalAmount - alreadyPlanned)
      }
    }

    if (plannedPayment <= 0 && currentRemaining > 0) {
      plannedPayment = currentRemaining
    }

    const theoreticalPayment = Math.min(plannedPayment, currentRemaining)
    const actualPayment = paymentsByMonthMap.get(currentMonth) || 0
    const hasPayment = monthHasPayment(contract, paymentsForSchedule, currentMonth)
    const displayedPayment = hasPayment ? actualPayment : theoreticalPayment

    const paymentApplied = hasPayment ? actualPayment : theoreticalPayment
    const remaining = Math.max(0, customRound(currentRemaining - paymentApplied))

    let status: 'PAID' | 'DUE' | 'FUTURE' = 'FUTURE'
    let paymentDate: Date | undefined
    let paymentTime: string | undefined

    if (hasPayment) {
      status = 'PAID'
      const paymentForThisMonth = sortedPayments.find((payment) => getCreditPaymentMonthNumber(contract, payment) === currentMonth)
      if (paymentForThisMonth) {
        paymentDate = new Date(paymentForThisMonth.paymentDate)
        paymentTime = (paymentForThisMonth as { paymentTime?: string }).paymentTime
      }
    } else {
      let allPreviousPaid = true
      for (let previousMonth = 1; previousMonth < currentMonth; previousMonth++) {
        if (!monthHasPayment(contract, paymentsForSchedule, previousMonth)) {
          allPreviousPaid = false
          break
        }
      }
      status = allPreviousPaid ? 'DUE' : 'FUTURE'
    }

    items.push({
      month: currentMonth,
      date,
      payment: customRound(displayedPayment),
      interest: 0,
      principal: customRound(currentRemaining),
      remaining,
      status,
      paidAmount: hasPayment ? actualPayment : undefined,
      paymentDate,
      paymentTime,
    })

    currentRemaining = remaining
    monthIndex++

    if (remaining <= 0 && monthIndex >= plannedDuration) {
      break
    }
  }

  return items.filter((item) => item.status === 'PAID' || item.payment > 0)
}

/** Manque à gagner total d'un contrat (cycle en cours), en FCFA. */
export function computeCreditLossTotal(contract: CreditContract, payments: CreditPayment[]): number {
  const cyclePayments = getCreditPaymentsForCurrentCycle(contract, payments)

  if (contract.creditType === 'FIXE' || contract.creditType === 'AIDE') {
    return customRound(
      buildSimpleCreditSchedule(contract, cyclePayments)
        .filter((row) => row.month > contract.duration && row.principal > 0)
        .reduce((sum, row) => sum + customRound(row.principal * SIMPLE_CREDIT_LOSS_RATE), 0),
    )
  }

  if (contract.creditType !== 'SPECIALE') return 0

  const monthlyRate = contract.interestRate / 100
  return customRound(
    buildCreditSpecialeHistory(contract, cyclePayments, { projectUntilZero: true })
      .filter((row) => row.phase === 'FIXE' && !row.isRest && row.capitalStart > 0)
      .reduce((sum, row) => sum + customRound(row.capitalStart * monthlyRate), 0),
  )
}
