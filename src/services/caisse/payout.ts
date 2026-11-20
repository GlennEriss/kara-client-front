import { actualContractNominalPaid, sumContractNominalPaid, computeContractBonusFromPayments } from './bonus'

interface RefundAmount {
  withdrawalAmount?: number
  amountNominal?: number
  amountBonus?: number
}

export function recordedCaisseSpecialeRefundAmount(
  refund?: RefundAmount,
): number | null {
  if (typeof refund?.withdrawalAmount === 'number' && Number.isFinite(refund.withdrawalAmount) && refund.withdrawalAmount > 0) {
    return refund.withdrawalAmount
  }
  if (typeof refund?.amountNominal === 'number' && Number.isFinite(refund.amountNominal)
    && typeof refund.amountBonus === 'number' && Number.isFinite(refund.amountBonus)) {
    return refund.amountNominal + refund.amountBonus
  }
  return null
}

/** Un remboursement enregistré prime sur la prévision recalculée à ce jour. */
export function computeCaisseSpecialePayoutAmount(
  contract: Parameters<typeof computeContractBonusFromPayments>[0],
  payments: Parameters<typeof computeContractBonusFromPayments>[1],
  settings: Parameters<typeof computeContractBonusFromPayments>[2],
  refund?: RefundAmount,
  now?: Date,
): number {
  const recorded = recordedCaisseSpecialeRefundAmount(refund)
  if (recorded !== null) return recorded
  const monetaryPayments = payments as Parameters<typeof sumContractNominalPaid>[0] | undefined
  const nominal = actualContractNominalPaid(contract, monetaryPayments)
  const bonus = computeContractBonusFromPayments({ ...contract, nominalPaid: nominal }, payments, settings, now)
  return nominal + bonus.amount
}
