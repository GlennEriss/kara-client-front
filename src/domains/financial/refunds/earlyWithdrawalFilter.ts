import { collection, db, getDocs } from '@/firebase/firestore'

export type EarlyWithdrawalFilter = 'all' | 'IN_PROGRESS' | 'FINALIZED'
export type RefundFund = 'CS' | 'CI'

export const EARLY_WITHDRAWAL_FILTER_LABELS: Record<EarlyWithdrawalFilter, string> = {
  all: 'Tous les contrats',
  IN_PROGRESS: 'Retrait anticipé non payé',
  FINALIZED: 'Retrait anticipé payé',
}

export function matchesEarlyWithdrawalFilter(
  refund: Record<string, unknown>,
  filter: Exclude<EarlyWithdrawalFilter, 'all'>,
  fund: RefundFund,
): boolean {
  const type = String(refund.type || (fund === 'CI' ? 'EARLY' : ''))
  if (type !== 'EARLY') return false

  const status = String(refund.status || '')
  return filter === 'IN_PROGRESS'
    ? status === 'PENDING' || status === 'APPROVED'
    : status === 'PAID'
}

/**
 * Retourne les contrats ayant un retrait anticipé dans l'état demandé.
 * Firestore ne permet pas de joindre un contrat à sa sous-collection : les
 * sous-collections des contrats candidats sont donc lues en parallèle.
 */
export async function getEarlyWithdrawalContractIds(
  fund: RefundFund,
  filter: EarlyWithdrawalFilter,
  candidateContractIds: string[],
): Promise<Set<string>> {
  if (filter === 'all') return new Set()

  const parentCollection = fund === 'CS' ? 'caisseContracts' : 'contractsCI'
  const refundsCollection = fund === 'CS' ? 'refunds' : 'earlyRefunds'
  const contractIds = new Set<string>()

  await Promise.all(Array.from(new Set(candidateContractIds.filter(Boolean))).map(async (contractId) => {
    const snapshot = await getDocs(collection(db, parentCollection, contractId, refundsCollection))
    if (snapshot.docs.some((refundDoc) => matchesEarlyWithdrawalFilter(refundDoc.data(), filter, fund))) {
      contractIds.add(contractId)
    }
  }))

  return contractIds
}
