import type { CreditContract } from '@/types/types'
import { addContractMonths } from './contract-months'

type PeriodContract = Pick<CreditContract, 'firstPaymentDate'> &
  Partial<Pick<CreditContract, 'duration' | 'durationUnit'>>
const day = (value: Date | string) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

/** A weekly package keeps its first agreed due date. Subsequent installments
 * are always seven days apart, including packages initially lasting 2/3 weeks. */
export function getCreditPeriodDueDate(contract: PeriodContract, period: number): Date {
  if (contract.durationUnit !== 'WEEKS')
    return addContractMonths(new Date(contract.firstPaymentDate), period - 1)
  const date = new Date(contract.firstPaymentDate)
  date.setDate(date.getDate() + (period - 1) * 7)
  return date
}

export function getCreditPeriodIndex(contract: PeriodContract, value: Date): number {
  const first = day(contract.firstPaymentDate),
    current = day(value)
  if (contract.durationUnit === 'WEEKS')
    return Math.max(1, Math.floor((current.getTime() - first.getTime()) / (7 * 86400000)) + 1)
  return Math.max(
    1,
    (current.getFullYear() - first.getFullYear()) * 12 + current.getMonth() - first.getMonth() + 1,
  )
}

/** Interest stops one calendar month after the weekly calendar starts. The
 * initial package duration is only used to recover this original start date. */
export function getWeeklyInterestEndDate(contract: PeriodContract): Date {
  const start = new Date(contract.firstPaymentDate)
  start.setDate(start.getDate() - Math.min(3, Math.max(1, contract.duration || 1)) * 7)
  return addContractMonths(start, 1)
}

export function creditPeriodLabel(
  contract: { durationUnit?: CreditContract['durationUnit'] },
  period: number,
): string {
  return contract.durationUnit === 'WEEKS' ? `Éch. ${period}` : `M${period}`
}
