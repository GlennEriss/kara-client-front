import type { CreditContract, CreditPayment } from '@/types/types'
import { addContractMonths } from './contract-months'
import { customRound } from './credit-speciale-calculations'
import {
  buildCreditSpecialeHistory,
  getCreditPaymentMonthNumber,
  getCreditPaymentsForCurrentCycle,
  getCreditContractCycles,
  getCreditPaymentCycleNumber,
} from './credit-speciale-history'

/**
 * Manque à gagner d'un crédit : les intérêts que le KARA ne perçoit pas.
 * - Crédit spécial : en partie fixe, chaque mois où il reste du capital
 *   (capital × taux mensuel).
 * - Crédit fixe / aide : montant du prêt non remboursé après le terme.
 *   Les 10 % mensuels sont des pénalités, suivies séparément.
 * Même calcul que l'onglet « Manque à gagner » du contrat.
 */

/** Taux mensuel des pénalités du fixe / aide après la durée contractuelle. */
export const SIMPLE_CREDIT_PENALTY_RATE = 0.1
/** Compatibilité des imports ; il s'agit de pénalités après terme. */
export const SIMPLE_CREDIT_LOSS_RATE = SIMPLE_CREDIT_PENALTY_RATE

/** Pénalités mensuelles simples, sans intérêts sur les pénalités.
 * Le solde est reconstitué avec les versements réels : une mensualité théorique
 * non versée ne réduit jamais la dette. Chaque ancien cycle s'arrête au rajout.
 */
export function buildPostTermPenaltyHistory(contract: CreditContract, payments: CreditPayment[], asOf = new Date()) {
  if (!['FIXE', 'AIDE'].includes(contract.creditType)) return []
  const cycles = getCreditContractCycles(contract)
  const endedAt = contract.writeOff?.writtenOffAt ?? contract.closedAt ?? contract.dischargedAt ?? (contract.status === 'TRANSFORMED' ? contract.transformedAt : undefined)
  const finalCutoff = endedAt && new Date(endedAt) < asOf ? new Date(endedAt) : asOf
  return cycles.flatMap((cycle, index) => {
    const next = cycles[index + 1]?.startedAt
    const until = next && new Date(next) < finalCutoff ? new Date(next) : finalCutoff
    const cyclePayments = payments.filter(payment => getCreditPaymentCycleNumber(contract, payment) === cycle.cycleNumber && payment.amount > 0)
    const result: { month: number; date: Date; lossAmount: number; base: number; cycleNumber: number }[] = []
    for (let month = Math.max(1, cycle.duration) + 1; month <= 1200; month++) {
      const date = addContractMonths(new Date(cycle.firstPaymentDate), month - 1)
      if (!Number.isFinite(date.getTime()) || date > until || (next && date >= new Date(next))) break
      const paidBefore = cyclePayments.filter(payment => new Date(payment.paymentDate) < date).reduce((sum, payment) => sum + payment.amount, 0)
      const base = Math.max(0, customRound(cycle.totalAmount - paidBefore))
      if (!base) break
      result.push({ month, date, base, cycleNumber: cycle.cycleNumber, lossAmount: customRound(base * SIMPLE_CREDIT_PENALTY_RATE) })
    }
    return result
  })
}

/** Les anciens encaissements MAG du fixe/aide réglaient déjà ces 10 % : ils sont
 * conservés et présentés comme paiements de pénalités, sans réécriture en base. */
export function computePostTermPenaltyBalance(contract: CreditContract, payments: CreditPayment[], asOf = new Date()) {
  const history = buildPostTermPenaltyHistory(contract, payments, asOf)
  const gross = customRound(history.reduce((sum, row) => sum + row.lossAmount, 0))
  const paid = (contract.missedEarningsPayments ?? []).filter(payment => new Date(payment.date) <= asOf).reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
  return { history, gross, paid, net: Math.max(0, gross - paid) }
}

/** Somme non remboursée au-delà du terme, distincte des pénalités. */
export function simpleCreditUnreturnedAmount(contract: CreditContract, payments: CreditPayment[], asOf = new Date()) {
  const cycle = getCreditContractCycles(contract).filter(cycle => new Date(cycle.startedAt) <= asOf).at(-1)
  if (!cycle) return 0
  const end = addContractMonths(new Date(cycle.firstPaymentDate), Math.max(1, cycle.duration) - 1)
  if (!Number.isFinite(end.getTime()) || end >= asOf) return 0
  const paid = payments.filter(payment => getCreditPaymentCycleNumber(contract, payment) === cycle.cycleNumber && payment.amount > 0 && new Date(payment.paymentDate) <= asOf).reduce((sum, payment) => sum + payment.amount, 0)
  return Math.max(0, customRound(cycle.totalAmount - paid))
}

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

/**
 * Manque à gagner généré à la date demandée (cycle en cours), en FCFA.
 * Les échéances futures ne constituent pas encore un manque à gagner.
 */
export function buildCreditLossHistory(contract: CreditContract, payments: CreditPayment[], asOf = new Date()) {
  const cyclePayments = getCreditPaymentsForCurrentCycle(contract, payments)
  const asOfTime = asOf.getTime()
  if (contract.creditType === 'FIXE' || contract.creditType === 'AIDE') {
    const amount = simpleCreditUnreturnedAmount(contract, payments, asOf)
    const cycle = getCreditContractCycles(contract).filter(cycle => new Date(cycle.startedAt) <= asOf).at(-1)
    return amount > 0 && cycle ? [{ month: cycle.duration, date: addContractMonths(new Date(cycle.firstPaymentDate), Math.max(1, cycle.duration) - 1), lossAmount: amount }] : []
  }
  if (contract.creditType !== 'SPECIALE') return []
  return buildCreditSpecialeHistory(contract, cyclePayments, { projectUntilZero: true })
    .filter(row => row.phase === 'FIXE' && !row.isRest && row.capitalStart > 0 && row.date.getTime() <= asOfTime)
    .map(row => ({ month: row.month, date: row.date, lossAmount: customRound(row.capitalStart * (contract.interestRate / 100)) }))
}
export function computeCreditLossTotal(contract: CreditContract, payments: CreditPayment[], asOf = new Date()): number {
  return customRound(buildCreditLossHistory(contract, payments, asOf).reduce((sum, row) => sum + row.lossAmount, 0))
}

/** Manque à gagner déjà encaissé après la fin du contrat. */
export function missedEarningsPaid(contract: Pick<CreditContract, 'missedEarningsPayments'>): number {
  return (contract.missedEarningsPayments ?? []).reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
}

/** Manque à gagner calculé, encaissé, et restant à encaisser. */
export function computeMissedEarningsBalance(
  contract: CreditContract,
  payments: CreditPayment[],
  asOf: Date = new Date(),
) {
  const gross = computeCreditLossTotal(contract, payments, asOf)
  const paid = ['FIXE', 'AIDE'].includes(contract.creditType) ? 0 : missedEarningsPaid(contract)
  return { gross, paid, net: Math.max(0, gross - paid) }
}
