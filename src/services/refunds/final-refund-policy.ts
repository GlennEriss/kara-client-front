import { resolveContractEndAt } from '@/services/caisse/contractDates'
import {
  actualContractNominalPaid,
  sumContractNominalPaid,
} from '@/services/caisse/bonus'
import { getContractEndDate } from '@/utils/caisse-imprevue-utils'
import {
  isCaisseSpecialeContractLocked,
  isCaisseImprevueContractLocked,
} from '@/utils/contract-lock'

type Payment = Parameters<typeof sumContractNominalPaid>[0][number] & {
  targetAmount?: number
  versements?: { amount?: number }[]
}
export function contractTermReached(end: unknown, now = new Date()): boolean {
  const raw =
    end && typeof (end as { toDate?: () => Date }).toDate === 'function'
      ? (end as { toDate: () => Date }).toDate()
      : end
  const date = raw ? new Date(raw as string | Date) : null
  if (!date || !Number.isFinite(date.getTime())) return false
  const day = (value: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Libreville',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value)
  return day(date) <= day(now)
}
export function sumCINominalPaid(payments: Payment[]): number {
  return payments.reduce((total, payment) => {
    if (
      typeof payment.accumulatedAmount === 'number' &&
      Number.isFinite(payment.accumulatedAmount) &&
      payment.accumulatedAmount > 0
    )
      return total + Math.max(0, payment.accumulatedAmount)
    if (payment.versements?.length)
      return (
        total +
        payment.versements.reduce(
          (sum, versement) => sum + Math.max(0, Number(versement.amount) || 0),
          0,
        )
      )
    return (
      total +
      (payment.status === 'PAID'
        ? Math.max(0, Number(payment.targetAmount) || 0)
        : 0)
    )
  }, 0)
}
function result(
  statusLocked: boolean,
  planned: number,
  payments: Payment[],
  endAt: unknown,
  totalPaid: number,
  now: Date,
) {
  const rawEnd =
    endAt && typeof (endAt as { toDate?: () => Date }).toDate === 'function'
      ? (endAt as { toDate: () => Date }).toDate()
      : endAt
  const normalizedEnd = rawEnd ? new Date(rawEnd as Date | string) : null
  const end =
    normalizedEnd && Number.isFinite(normalizedEnd.getTime())
      ? normalizedEnd
      : null
  const fullyPaid =
    planned > 0 &&
    payments.length >= planned &&
    payments.every((payment) => payment.status === 'PAID')
  const reachedTerm = contractTermReached(endAt, now)
  return {
    eligible: !statusLocked && totalPaid > 0 && (fullyPaid || reachedTerm),
    reachedTerm,
    fullyPaid,
    totalPaid,
    endAt: end,
  }
}
export function caisseSpecialeFinalRefundEligibility(
  contract: Parameters<typeof resolveContractEndAt>[0] & {
    status?: string
    nominalPaid?: number
  },
  payments: Payment[],
  now = new Date(),
) {
  return result(
    isCaisseSpecialeContractLocked(contract.status),
    Number(contract.monthsPlanned) || 0,
    payments,
    resolveContractEndAt(contract),
    actualContractNominalPaid(contract, payments),
    now,
  )
}
export function caisseImprevueFinalRefundEligibility(
  contract: Parameters<typeof getContractEndDate>[0] & { status?: string },
  payments: Payment[],
  now = new Date(),
) {
  return result(
    isCaisseImprevueContractLocked(contract.status) ||
      contract.status !== 'ACTIVE',
    Number(contract.subscriptionCIDuration) || 0,
    payments,
    getContractEndDate(contract),
    sumCINominalPaid(payments),
    now,
  )
}
