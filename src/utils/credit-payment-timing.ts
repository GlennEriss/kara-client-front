import type { CreditContract, CreditPayment } from '@/types/types'
import { buildCreditTimeline } from './credit-timeline'
import {
  getCreditContractCycles,
  getCreditPaymentCycleNumber,
  getCreditPaymentMonthNumber,
  type CreditSpecialeTimelineMonth,
} from './credit-speciale-history'
import { getCreditPeriodDueDate } from './credit-periods'
import {
  getPaymentPunctuality,
  punctualityLabel,
  type PaymentPunctuality,
} from './credit-payment-punctuality'

export const creditPunctuality = (value: {
  kind: PaymentPunctuality
  daysLate: number
}) => ({ ...value, label: punctualityLabel(value.kind, value.daysLate) })
const validDate = (value: unknown): value is Date | string =>
  (value instanceof Date || typeof value === 'string') &&
  !!value &&
  !Number.isNaN(new Date(value).getTime())

/** Dates et ponctualité communes aux trois crédits, sans modifier leurs montants. */
export function creditPaymentTimingMap(
  contract: CreditContract,
  payments: CreditPayment[],
  history: CreditSpecialeTimelineMonth[] = buildCreditTimeline(
    contract,
    payments,
  ),
) {
  const cycles = getCreditContractCycles(contract)
  const dates = new Map(
    history.map((r) => [`${r.cycleNumber}_${r.cycleMonth}`, r.date]),
  )
  return new Map(
    payments.map((payment) => {
      const cycleNumber = getCreditPaymentCycleNumber(contract, payment)
      const month = getCreditPaymentMonthNumber(contract, payment)
      const cycle = cycles.find((c) => c.cycleNumber === cycleNumber)
      const sourceCycle = contract.creditCycles?.find(
        (c, i) => (c.cycleNumber ?? i + 1) === cycleNumber,
      )
      const firstDate = sourceCycle
        ? sourceCycle.firstPaymentDate
        : contract.firstPaymentDate
      const dueDate =
        cycle && validDate(firstDate) && Number.isInteger(month) && month > 0
          ? (contract.creditType === 'SPECIALE'
              ? dates.get(`${cycleNumber}_${month}`)
              : undefined) ||
            getCreditPeriodDueDate(
              { ...contract, firstPaymentDate: cycle.firstPaymentDate },
              month,
            )
          : undefined
      const penaltyOnly =
        payment.amount === 0 &&
        !!payment.comment?.includes('Paiement de pénalités uniquement')
      const punctuality = penaltyOnly
        ? null
        : creditPunctuality(
            payment.amount === 0
              ? { kind: 'NO_PAYMENT', daysLate: 0 }
              : dueDate
                ? getPaymentPunctuality(dueDate, payment.paymentDate)
                : { kind: 'UNKNOWN', daysLate: 0 },
          )
      return [
        payment.id,
        {
          dueDate:
            !penaltyOnly && dueDate && validDate(dueDate) ? dueDate : null,
          punctuality,
        },
      ] as const
    }),
  )
}
