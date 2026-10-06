import type { CreditContract, CreditContractStatus, CreditRecovery, CreditWriteOff } from '@/types/types'

/**
 * Clôture d'un crédit en perte : quand on sait que le membre ne remboursera
 * plus, le SuperAdmin clôt le contrat sans remboursement complet. Le reste dû
 * est enregistré comme perte ; les sommes récupérées ensuite la réduisent.
 */

/** Statuts où le contrat est terminé : plus d'échéances, de paiements ni de modifications. */
export const ENDED_CREDIT_STATUSES: CreditContractStatus[] = ['DISCHARGED', 'CLOSED', 'WRITTEN_OFF']

export function isCreditContractEnded(status: CreditContractStatus | string | undefined): boolean {
  return ENDED_CREDIT_STATUSES.includes(status as CreditContractStatus)
}

/** Statuts depuis lesquels un contrat peut être clôturé en perte. */
export const WRITE_OFF_ELIGIBLE_STATUSES: CreditContractStatus[] = ['ACTIVE', 'OVERDUE', 'PARTIAL', 'BLOCKED']

export function canWriteOffContract(contract: Pick<CreditContract, 'status' | 'amountRemaining'>): boolean {
  return WRITE_OFF_ELIGIBLE_STATUSES.includes(contract.status) && (contract.amountRemaining ?? 0) > 0
}

/** Montants enregistrés à la clôture en perte. */
export function buildWriteOffAmounts(input: {
  amountRemaining: number
  unpaidPenalties: number
  guarantorCommissionDue: number
}): Pick<CreditWriteOff, 'amountRemaining' | 'unpaidPenalties' | 'guarantorCommissionCancelled'> {
  const round = (value: number) => Math.max(0, Math.round(Number(value) || 0))
  return {
    amountRemaining: round(input.amountRemaining),
    unpaidPenalties: round(input.unpaidPenalties),
    guarantorCommissionCancelled: round(input.guarantorCommissionDue),
  }
}

export function totalRecovered(recoveries: CreditRecovery[] | undefined): number {
  return (recoveries ?? []).reduce((sum, recovery) => sum + (Number(recovery.amount) || 0), 0)
}

/** Perte brute (reste dû + pénalités), récupéré, et perte nette restante. */
export function computeWriteOffLoss(contract: Pick<CreditContract, 'writeOff' | 'writeOffRecoveries'>) {
  const gross = contract.writeOff ? contract.writeOff.amountRemaining + contract.writeOff.unpaidPenalties : 0
  const recovered = totalRecovered(contract.writeOffRecoveries)
  return { gross, recovered, net: Math.max(0, gross - recovered) }
}
