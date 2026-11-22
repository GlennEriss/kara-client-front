import type { CreditContract } from '@/types/types'

export function isCreditContractOverdue(
  contract: Pick<CreditContract, 'status' | 'nextDueAt'>,
  now = new Date(),
): boolean {
  if (contract.status === 'OVERDUE') return true
  if (!['ACTIVE', 'PARTIAL'].includes(contract.status) || !contract.nextDueAt) return false

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  return new Date(contract.nextDueAt).getTime() < today.getTime()
}
