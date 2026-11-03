import { endOfMonth, startOfDay, startOfMonth } from 'date-fns'
import type { ContractCI } from '@/types/types'
import { getPaymentDueDate } from '@/utils/caisse-imprevue-utils'

/** Même échéancier CI ; seules les périodes visibles nécessitent une lecture de paiements. */
export function getCalendarPeriodsCI(contract: ContractCI, month: Date) {
  const from = startOfMonth(month)
  const to = endOfMonth(month)
  return Array.from({ length: contract.subscriptionCIDuration || 0 }, (_, monthIndex) => ({
    monthIndex,
    dueDate: getPaymentDueDate(contract, monthIndex) ?? new Date(contract.firstPaymentDate),
  })).filter(({ dueDate }) => {
    const day = startOfDay(dueDate)
    return day >= from && day <= to
  })
}
