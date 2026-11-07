import type { CreditPayment, CreditPenalty } from '@/types/types'

/** Les dettes impayées ne doivent jamais devenir des reçus de versement. */
export function getPaidCreditPenaltiesForGlobalFacture(
  payments: CreditPayment[],
  penalties: CreditPenalty[]
): CreditPenalty[] {
  const paymentsById = new Map(payments.map((payment) => [payment.id, payment]))
  return penalties.filter((penalty) => {
    if (!penalty.paid || penalty.amount <= 0) return false
    const linkedPayment = penalty.paymentId ? paymentsById.get(penalty.paymentId) : undefined
    return !(
      linkedPayment &&
      (linkedPayment.penaltyAmount > 0 || linkedPayment.comment?.includes('Paiement de pénalités uniquement'))
    )
  })
}
