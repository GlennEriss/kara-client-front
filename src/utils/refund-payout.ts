import { addDays } from 'date-fns'

export const EARLY_REFUND_PAYOUT_DAYS = 30

export function findCardEarlyWithdrawal(refunds: Array<Record<string, unknown>> = []) {
  const early = refunds.filter((refund) => refund.type === 'EARLY')
  return early.find((refund) => refund.status === 'APPROVED')
    ?? early.find((refund) => refund.status === 'PENDING')
    ?? early.find((refund) => refund.status === 'PAID')
}

export function refundDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof (value as { toDate?: () => Date })?.toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate()
    return Number.isNaN(date.getTime()) ? null : date
  }
  const date = new Date(value as string | number)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Date limite d'une remise anticipée : J+30 après approbation. */
export function earlyRefundPayoutDueAt(refund: Record<string, unknown>): Date | null {
  const explicit = refundDate(refund.payoutDueAt)
  if (explicit) return explicit
  const approvedAt = refundDate(refund.approvedAt)
  if (approvedAt) return addDays(approvedAt, EARLY_REFUND_PAYOUT_DAYS)
  return null
}

/** Autorisation de remise : superadmin à tout moment, autre admin à partir de J+30. */
export function canFinalizeEarlyRefundAt(
  refund: Record<string, unknown>,
  isSuperAdmin: boolean,
  handoverAt: unknown,
): boolean {
  if (isSuperAdmin) return true
  const dueAt = earlyRefundPayoutDueAt(refund)
  const handoverDate = refundDate(handoverAt)
  if (!dueAt || !handoverDate) return false

  // La saisie de l'heure est à la minute : les secondes de l'approbation ne
  // doivent pas bloquer une remise au cours de la minute d'échéance.
  const dueMinute = new Date(dueAt)
  dueMinute.setSeconds(0, 0)
  return handoverDate.getTime() >= dueMinute.getTime()
}
