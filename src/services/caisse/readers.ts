import { getContract, updateContract } from '@/db/caisse/contracts.db'
import { listPayments } from '@/db/caisse/payments.db'
import { listRefunds } from '@/db/caisse/refunds.db'
import { computeDueWindow, computeNextDueAt } from './engine'

function toDateSafe(v: any): Date | null {
  try {
    if (!v) return null
    if (v instanceof Date) return v
    if (typeof v?.toDate === 'function') return v.toDate()
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  } catch { return null }
}

export async function getContractWithComputedState(contractId: string) {
  const c = await getContract(contractId)
  if (!c) return null
  const payments = await listPayments(contractId)
  const refunds = await listRefunds(contractId)

  // Statut initial
  let status = c.status || 'ACTIVE'

  // Si contrat clos ou résilié, ne pas écraser le statut
  if (status !== 'CLOSED' && status !== 'RESCINDED') {
    // Forcer le statut selon les remboursements en cours
    const hasFinalPending = refunds.some((r: any) => r.type === 'FINAL' && (r.status === 'PENDING' || r.status === 'APPROVED'))
    const hasEarlyPending = refunds.some((r: any) => r.type === 'EARLY' && (r.status === 'PENDING' || r.status === 'APPROVED'))
    if (hasFinalPending) {
      status = 'FINAL_REFUND_PENDING'
    } else if (hasEarlyPending) {
      status = 'EARLY_REFUND_PENDING'
    } else {
      // Sinon, calcul selon prochaine échéance DUE
      const nextDue = payments.find((p: any) => p.status === 'DUE')
      if (nextDue?.dueAt) {
        const dueDate = toDateSafe(nextDue.dueAt)
        if (dueDate) {
          const now = new Date()
          
          // Si l'échéance est dans le futur, pas de retard
          if (dueDate > now) {
            status = 'ACTIVE'
          } else {
            // Sinon, calculer le retard (échéance passée et non payée)
            const { window } = computeDueWindow(dueDate, now)
            if (window === 'DEFAULTED_AFTER_J12') status = 'RESCINDED'
            else if (window === 'LATE_WITH_PENALTY') status = 'LATE_WITH_PENALTY'
            else if (window === 'LATE_NO_PENALTY') status = 'LATE_NO_PENALTY'
            else status = 'ACTIVE'
          }
        }
      } else {
        // Aucune échéance DUE = toutes les échéances payées → pas de retard
        status = 'ACTIVE'
      }
    }
  }

  const nextDueAt = computeNextDueAt({
    ...c,
    contractStartAt: toDateSafe(c.contractStartAt) || undefined,
  } as any)

  // Écriture compensatoire minimale
  await updateContract(contractId, { status, nextDueAt })

  return { ...c, payments, refunds, status, nextDueAt }
}

export async function recomputeNow(contractId: string) {
  return getContractWithComputedState(contractId)
}

