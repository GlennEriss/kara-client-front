import type { PaymentCI, VersementCI } from '@/types/types'

export const getMemberQuarterForPdf = (member?: { address?: { district?: string } } | null): string =>
  member?.address?.district?.trim() || 'Non renseigné'

export interface CaisseSpecialeRecordedVersement {
  amount: number
  paidAt?: unknown
  time?: string
  mode?: string
  withFees?: boolean
  paymentMethodOther?: string
  updatedBy?: string
  createdBy?: string
}

interface CaisseSpecialePaymentLike extends Omit<CaisseSpecialeRecordedVersement, 'amount'> {
  amount?: number
  accumulatedAmount?: number
  status?: string
  contribs?: CaisseSpecialeRecordedVersement[]
}

const positiveAmount = (value: unknown): boolean => typeof value === 'number' && Number.isFinite(value) && value > 0

/** Conserve chaque remise, y compris plusieurs saisies le même jour. */
export function getCaisseSpecialeRecordedVersements(payment: CaisseSpecialePaymentLike): CaisseSpecialeRecordedVersement[] {
  const contributions = (payment.contribs ?? []).filter((entry) => positiveAmount(entry.amount))
  if (contributions.length) return contributions
  const amount = positiveAmount(payment.accumulatedAmount)
    ? payment.accumulatedAmount!
    : payment.status === 'PAID' || payment.paidAt ? payment.amount : undefined
  return positiveAmount(amount) ? [{ ...payment, amount: amount! }] : []
}

/** Les échéances reconstruites par le calendrier ne sont pas des versements. */
export function getCIRecordedVersements(payment: PaymentCI): Array<Partial<VersementCI> & { amount: number }> {
  const versements = (payment.versements ?? []).filter((entry) => positiveAmount(entry.amount))
  if (versements.length) return versements
  // Anciens cumuls sans détail : conserver le montant acquis, sans inventer de date.
  return positiveAmount(payment.accumulatedAmount) ? [{ amount: payment.accumulatedAmount }] : []
}

/** Une remise répartie sur plusieurs mois garde un seul identifiant de saisie. */
export function getCIRecordedVersementCount(payments: PaymentCI[]): number {
  const operations = new Set<string>()
  payments.forEach((payment) => getCIRecordedVersements(payment).forEach((entry, index) => {
    operations.add(entry.splitGroupId ? `split:${entry.splitGroupId}` : `${payment.id}:${entry.id ?? index}`)
  }))
  return operations.size
}
