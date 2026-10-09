/**
 * Suppression des versements dans l'ordre inverse, comme au crédit spécial :
 * seul le dernier versement enregistré se supprime, puis le précédent, etc.
 * Un trou au milieu de l'historique fausserait les cumuls, les pénalités et
 * le bonus des mois suivants.
 */

type DateLike = Date | string | number | { toDate: () => Date } | null | undefined

const toTime = (value: DateLike): number => {
  if (!value) return 0
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate().getTime()
  const time = new Date(value as Date | string | number).getTime()
  return Number.isNaN(time) ? 0 : time
}

/** « 2026-03-12 » + « 14:30 » → horodatage. */
const dayTime = (date?: string, time?: string): number => {
  if (!date) return 0
  const parsed = new Date(`${date}T${time && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : '00:00'}:00`).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

const ORDER_MESSAGE = 'Supprimez les versements dans l’ordre inverse : le plus récent d’abord.'

// ==================== Caisse Imprévue ====================

interface CiVersementLike {
  id: string
  date?: string
  time?: string
  createdAt?: DateLike
}
interface CiPaymentLike {
  monthIndex: number
  versements?: CiVersementLike[]
}

/** Dernier versement d'un contrat Caisse Imprévue : mois le plus avancé, puis date et heure. */
export function latestCaisseImprevueVersement(
  payments: CiPaymentLike[],
): { monthIndex: number; versementId: string } | null {
  let best: { monthIndex: number; versementId: string; key: [number, number, number] } | null = null
  for (const payment of payments) {
    for (const versement of payment.versements ?? []) {
      const key: [number, number, number] = [payment.monthIndex, dayTime(versement.date, versement.time), toTime(versement.createdAt)]
      if (!best || compareKeys(key, best.key) > 0) {
        best = { monthIndex: payment.monthIndex, versementId: versement.id, key }
      }
    }
  }
  return best ? { monthIndex: best.monthIndex, versementId: best.versementId } : null
}

export function getCaisseImprevueVersementDeletionBlocker(
  payments: CiPaymentLike[],
  monthIndex: number,
  versementId: string,
): string | null {
  const latest = latestCaisseImprevueVersement(payments)
  if (!latest) return 'Aucun versement à supprimer.'
  if (latest.monthIndex === monthIndex && latest.versementId === versementId) return null
  return `Seul le dernier versement (mois M${latest.monthIndex + 1}) peut être supprimé. ${ORDER_MESSAGE}`
}

// ==================== Caisse Spéciale ====================

interface CaisseContributionLike {
  id?: string
  paidAt?: DateLike
  createdAt?: DateLike
}
interface CaissePaymentLike {
  id: string
  status?: string
  dueMonthIndex?: number
  paidAt?: DateLike
  contribs?: CaisseContributionLike[]
}

/**
 * Dernier versement d'un contrat Caisse Spéciale : échéance la plus avancée,
 * puis contribution la plus récente (journalier, libre, groupe).
 */
export function latestCaisseSpecialePayment(
  payments: CaissePaymentLike[],
): { paymentId: string; contributionId?: string } | null {
  let best: { paymentId: string; contributionId?: string; key: [number, number, number] } | null = null
  for (const payment of payments) {
    const contribs = Array.isArray(payment.contribs) ? payment.contribs : []
    if (payment.status !== 'PAID' && contribs.length === 0) continue
    const month = payment.dueMonthIndex ?? 0
    if (contribs.length === 0) {
      const key: [number, number, number] = [month, toTime(payment.paidAt), 0]
      if (!best || compareKeys(key, best.key) > 0) best = { paymentId: payment.id, key }
      continue
    }
    for (const contrib of contribs) {
      const key: [number, number, number] = [month, toTime(contrib.paidAt), toTime(contrib.createdAt)]
      if (!best || compareKeys(key, best.key) > 0) {
        best = { paymentId: payment.id, contributionId: contrib.id ? String(contrib.id) : undefined, key }
      }
    }
  }
  return best ? { paymentId: best.paymentId, contributionId: best.contributionId } : null
}

export function getCaisseSpecialePaymentDeletionBlocker(
  payments: CaissePaymentLike[],
  paymentId: string,
  contributionId?: string,
): string | null {
  const latest = latestCaisseSpecialePayment(payments)
  if (!latest) return 'Aucun versement à supprimer.'
  if (latest.paymentId !== paymentId) {
    const target = payments.find((p) => p.id === latest.paymentId)
    return `Seul le dernier versement (M${(target?.dueMonthIndex ?? 0) + 1}) peut être supprimé. ${ORDER_MESSAGE}`
  }
  // Paiement à plusieurs contributions : seule la plus récente se supprime.
  if (latest.contributionId && contributionId && latest.contributionId !== String(contributionId)) {
    return `Seule la contribution la plus récente de ce versement peut être supprimée. ${ORDER_MESSAGE}`
  }
  return null
}

function compareKeys(left: number[], right: number[]): number {
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return left[i] - right[i]
  }
  return 0
}
