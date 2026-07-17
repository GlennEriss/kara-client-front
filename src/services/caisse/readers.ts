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
            // Désactivé : ne pas résilier automatiquement les contrats (ex. contrats créés avec une date très ancienne)
            // if (window === 'DEFAULTED_AFTER_J12') status = 'RESCINDED'
            if (window === 'DEFAULTED_AFTER_J12') status = 'LATE_WITH_PENALTY'
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

  // LIBRE / JOURNALIÈRE : le total versé réel = somme des montants accumulés de
  // tous les mois (acomptes inclus). Historique : nominalPaid ne comptait que
  // les mois complétés (plafonnés) → on recale à la lecture si écart.
  const updates: Record<string, unknown> = { status, nextDueAt }
  let nominalPaid = c.nominalPaid
  const t = c.caisseType
  if (t === 'LIBRE' || t === 'LIBRE_CHARITABLE' || t === 'JOURNALIERE' || t === 'JOURNALIERE_CHARITABLE') {
    const real = payments.reduce((sum: number, p: any) => {
      const acc = Number(p.accumulatedAmount)
      if (Number.isFinite(acc) && acc > 0) return sum + acc
      const contribs = Array.isArray(p.contribs) ? p.contribs : []
      return sum + contribs.reduce((s2: number, cb: any) => s2 + (Number(cb.amount) || 0), 0)
    }, 0)
    if (real > 0 && real !== (c.nominalPaid || 0)) {
      updates.nominalPaid = real
      nominalPaid = real
    }
  }

  // Écriture compensatoire minimale
  await updateContract(contractId, updates)

  return { ...c, payments, refunds, status, nextDueAt, nominalPaid }
}

export async function recomputeNow(contractId: string) {
  return getContractWithComputedState(contractId)
}

