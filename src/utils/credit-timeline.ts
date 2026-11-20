import type { CreditContract, CreditPayment } from '@/types/types'
import { getCreditPeriodDueDate } from './credit-periods'
import {
  buildCreditSpecialeTimelineHistory,
  getCreditContractCycles,
  getCreditPaymentCycleNumber,
  getCreditPaymentMonthNumber,
  type CreditSpecialeTimelineMonth,
} from '@/utils/credit-speciale-history'
const customRound = Math.round
/** Shared web/native timeline; preserves the existing fixed-credit calculation. */
export function buildCreditTimeline(
  contract: CreditContract,
  payments: CreditPayment[],
): CreditSpecialeTimelineMonth[] {
  if (contract.creditType === 'SPECIALE')
    return buildCreditSpecialeTimelineHistory(contract, payments)
  if (contract.creditType !== 'FIXE') return []
  const contractCycles = getCreditContractCycles(contract)
  const recordedPayments = payments.filter(
    (payment) =>
      payment.amount > 0 ||
      payment.comment?.includes('Paiement de 0 FCFA') ||
      (!payment.comment?.includes('Paiement de pénalités uniquement') &&
        payment.amount === 0),
  )

  const currentCycleNumber = contractCycles.at(-1)?.cycleNumber ?? 1

  return contractCycles.flatMap((cycle) => {
    const cyclePayments = recordedPayments.filter(
      (payment) =>
        getCreditPaymentCycleNumber(contract, payment) === cycle.cycleNumber,
    )
    const lastRecordedMonthRaw =
      cyclePayments.length > 0
        ? Math.max(
            ...cyclePayments.map((payment) =>
              getCreditPaymentMonthNumber(contract, payment),
            ),
          )
        : 0
    const lastRecordedMonth =
      lastRecordedMonthRaw > 0
        ? lastRecordedMonthRaw
        : cycle.cycleNumber === currentCycleNumber
          ? 1
          : 0

    if (lastRecordedMonth <= 0) {
      return []
    }

    const hasCustomSchedule = !!cycle.customSchedule?.length
    const cycleTotal = customRound(cycle.totalAmount)
    const plannedPaymentByMonth = new Map<number, number>()
    const plannedDuration = hasCustomSchedule
      ? Math.max(
          cycle.duration,
          ...cycle.customSchedule!.map(
            (entry, index) => entry.month || index + 1,
          ),
        )
      : Math.max(1, cycle.duration)

    if (hasCustomSchedule) {
      cycle.customSchedule!.forEach((entry, index) => {
        const month = entry.month || index + 1
        plannedPaymentByMonth.set(month, Math.max(0, customRound(entry.amount)))
      })
    } else {
      const basePayment = Math.floor(cycleTotal / plannedDuration)
      let cumulativePlanned = 0
      for (let month = 1; month <= plannedDuration; month++) {
        const payment =
          month === plannedDuration
            ? Math.max(0, cycleTotal - cumulativePlanned)
            : basePayment
        plannedPaymentByMonth.set(month, payment)
        cumulativePlanned += payment
      }
    }

    const cyclePaymentTotalsByMonth = new Map<number, number>()
    for (const payment of cyclePayments) {
      const month = getCreditPaymentMonthNumber(contract, payment)
      cyclePaymentTotalsByMonth.set(
        month,
        (cyclePaymentTotalsByMonth.get(month) ?? 0) + payment.amount,
      )
    }

    const cycleTitle =
      cycle.cycleNumber === 1
        ? 'Cycle initial'
        : 'Apres augmentation de credit - reprise a M1'

    const rows: CreditSpecialeTimelineMonth[] = []
    let capital = cycleTotal
    let nextDueAssigned = false

    for (let month = 1; month <= lastRecordedMonth; month++) {
      const date = getCreditPeriodDueDate(
        { ...contract, firstPaymentDate: cycle.firstPaymentDate },
        month,
      )
      const monthPayment = cyclePayments
        .filter((p) => getCreditPaymentMonthNumber(contract, p) === month)
        .sort(
          (a, b) =>
            new Date(a.paymentDate).getTime() -
            new Date(b.paymentDate).getTime(),
        )[0]

      const amountDue = Math.max(0, customRound(capital))
      const expectedPayment = Math.min(
        amountDue,
        Math.max(
          0,
          plannedPaymentByMonth.get(month) ??
            customRound(cycle.monthlyPaymentAmount),
        ),
      )
      const actualPayment = Math.max(
        0,
        cyclePaymentTotalsByMonth.get(month) ?? 0,
      )
      const hasPaymentRecord = cyclePaymentTotalsByMonth.has(month)

      const nextCapitalActual = Math.max(
        0,
        customRound(amountDue - actualPayment),
      )
      const nextCapitalProjected = Math.max(
        0,
        customRound(amountDue - expectedPayment),
      )

      let status: CreditSpecialeTimelineMonth['status'] = 'FUTURE'
      if (hasPaymentRecord) {
        status = 'PAID'
      } else if (!nextDueAssigned) {
        status = 'DUE'
        nextDueAssigned = true
      }

      rows.push({
        month,
        logicalMonth: month,
        date,
        phase: 'FIXE',
        isRest: false,
        capitalStart: amountDue,
        commission: 0,
        interest: 0,
        amountDue,
        expectedPayment,
        actualPayment,
        hasPaymentRecord,
        paymentDate: monthPayment
          ? new Date(monthPayment.paymentDate)
          : undefined,
        paymentTime: monthPayment?.paymentTime,
        nextCapitalActual,
        nextCapitalProjected,
        status,
        cycleNumber: cycle.cycleNumber,
        cycleMonth: month,
        cycleType: cycle.type,
        cycleTitle,
        cycleStartedAt: cycle.startedAt,
        key: `cycle-${cycle.cycleNumber}-month-${month}`,
      })

      capital = hasPaymentRecord ? nextCapitalActual : amountDue
    }

    return rows
  })
}
