import { sumCINominalPaid } from '@/services/refunds/final-refund-policy'
import type { PaymentCI } from '@/types/types'

export function summarizeCIPayments(payments: PaymentCI[], supportCount: number) {
  return {
    totalAmountPaid: sumCINominalPaid(payments),
    paymentCount: payments.length,
    paidMonthsCount: payments.filter((payment) => payment.status === 'PAID').length,
    supportCount,
  }
}
