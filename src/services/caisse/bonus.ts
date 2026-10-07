/**
 * Règle unique de calcul du bonus de Caisse Spéciale.
 *
 * Le bonus rémunère le temps pendant lequel l'association détient l'argent —
 * pas le nombre d'échéances soldées. Deux plafonds jouent donc ensemble :
 *
 *  - un membre qui **cesse de payer** ne voit pas son taux monter avec le temps
 *    qui passe ;
 *  - un membre qui **paie d'avance** n'obtient pas le taux d'un mois que
 *    l'association n'a pas encore vécu.
 *
 * D'où `min(mois complets écoulés, mois soldés)`, et le taux de ce mois : après
 * 12 mois complets, le taux M12. Cette règle vivait uniquement dans le
 * retrait anticipé ; le remboursement final et le simulateur l'ignoraient, et
 * pouvaient annoncer un bonus supérieur à celui réellement dû.
 */

import { computeBonus, contractMonthNumberAt } from './engine'
import type { CaisseSettings } from './types'

/** Premier mois ouvrant droit au bonus dans la table des taux. */
export const BONUS_FIRST_RATE_MONTH = 4

export interface BonusInput {
  /** Début du contrat = date du premier versement. */
  contractStartAt?: Date | string | null
  /** Nombre de mois effectivement soldés. */
  paidMonthsCount: number
  /** Assiette : total versé (nominal). */
  totalPaid: number
  settings?: CaisseSettings | null
  /**
   * Mois payés à l'heure avant le premier impayé (voir
   * `countOnTimeMonthsBeforeFirstUnpaid`). Absent : pas de plafond.
   */
  onTimeMonthsCount?: number
  /** Pénalités cumulées du contrat : retirées du bonus, jamais du nominal. */
  penaltiesTotal?: number
  /** Date de référence, pour les tests. */
  now?: Date
}

export interface BonusResult {
  /**
   * Mois complets retenus : `min(mois complets écoulés, mois soldés)`.
   * Le taux appliqué est celui de ce mois (12 mois complets → M12).
   */
  monthCount: number
  /** Taux appliqué, en pourcentage (0 si le seuil n'est pas atteint). */
  ratePercent: number
  /** Libellé du mois dont le taux est appliqué, ex. « M4 ». */
  rateLabel?: string
  /** Bonus versé : bonus brut moins les pénalités, jamais négatif. */
  amount: number
  /** Bonus avant déduction des pénalités. */
  grossAmount: number
  /** Pénalités effectivement retirées du bonus. */
  penaltiesDeducted: number
}

export function computeContractBonus({
  contractStartAt,
  paidMonthsCount,
  totalPaid,
  settings,
  onTimeMonthsCount,
  penaltiesTotal = 0,
  now = new Date(),
}: BonusInput): BonusResult {
  const paidCount = Math.max(0, Math.floor(paidMonthsCount || 0))

  // Mois COMPLETS écoulés depuis le premier versement : au 13e mois en cours,
  // 12 mois sont complets. On compare des mois complets à des mois soldés
  // (eux aussi complets) : comparer le mois en cours aux mois soldés retirait un
  // mois au terme du contrat (M11 au lieu de M12).
  // Sans date de début (simulation), le mois soldé N est supposé en cours.
  const start = contractStartAt ? new Date(contractStartAt) : null
  const completedMonths =
    start && !Number.isNaN(start.getTime())
      ? contractMonthNumberAt(start, now) - 1
      : Math.max(0, paidCount - 1)

  // Après un impayé, le bonus reste figé au dernier mois payé à l'heure : un
  // rattrapage ultérieur ne fait plus monter le taux.
  const onTimeCap = typeof onTimeMonthsCount === 'number' ? Math.max(0, onTimeMonthsCount) : Infinity
  const monthCount = Math.max(0, Math.min(completedMonths, paidCount, onTimeCap))
  // computeBonus lit la table à l'index `mois - 1` (M4 = index 3).
  const ratePercent = monthCount >= BONUS_FIRST_RATE_MONTH ? computeBonus(monthCount - 1, settings) || 0 : 0

  if (ratePercent <= 0) {
    return { monthCount, ratePercent: 0, amount: 0, grossAmount: 0, penaltiesDeducted: 0 }
  }

  const grossAmount = Math.round((totalPaid || 0) * (ratePercent / 100))
  // Les pénalités sont retirées du bonus, pas du nominal ; le bonus ne descend pas sous 0.
  const penaltiesDeducted = Math.min(grossAmount, Math.max(0, Math.round(penaltiesTotal || 0)))
  return {
    monthCount,
    ratePercent,
    rateLabel: `M${monthCount}`,
    amount: grossAmount - penaltiesDeducted,
    grossAmount,
    penaltiesDeducted,
  }
}

/**
 * Retard toléré avant de figer le bonus : 20 jours après l'échéance. Distinct
 * de la tolérance des pénalités (pénalité dès le 4e jour de retard).
 */
export const BONUS_LATE_TOLERANCE_DAYS = 20

type PaymentLike = {
  dueMonthIndex?: number
  dueAt?: unknown
  paidAt?: unknown
  status?: string
  contribs?: Array<{ paidAt?: unknown }>
}

const toDay = (value: unknown): Date | null => {
  if (!value) return null
  const date =
    typeof (value as { toDate?: () => Date })?.toDate === 'function'
      ? (value as { toDate: () => Date }).toDate()
      : new Date(value as string | number | Date)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

/**
 * Nombre de mois payés à l'heure avant le premier impayé. Une échéance est
 * impayée si elle a été réglée plus de 20 jours après sa date, ou si elle ne
 * l'est toujours pas alors que ce délai est dépassé. Le bonus est alors calculé
 * sur le dernier mois payé à l'heure avant ce premier impayé.
 * Les échéances sans date (données anciennes) ne sont pas pénalisées.
 */
export function countOnTimeMonthsBeforeFirstUnpaid(payments: PaymentLike[]): number {
  const dayMs = 24 * 60 * 60 * 1000
  const ordered = [...payments].sort((a, b) => (a.dueMonthIndex ?? 0) - (b.dueMonthIndex ?? 0))
  let count = 0
  for (const payment of ordered) {
    const due = toDay(payment.dueAt)
    if (payment.status === 'PAID') {
      const paid = toDay(payment.paidAt ?? payment.contribs?.[0]?.paidAt)
      if (due && paid && (paid.getTime() - due.getTime()) / dayMs > BONUS_LATE_TOLERANCE_DAYS) break
      count += 1
      continue
    }
    // Échéance non payée : impayée si le délai est dépassé, sinon simplement à
    // venir. Dans les deux cas, la suite n'est pas « payée à l'heure ».
    break
  }
  return count
}

/**
 * Total des pénalités d'un contrat, à partir de ses échéances : somme des
 * pénalités de chaque versement (`contribs[].penalty`), sinon la pénalité de
 * l'échéance (`penaltyApplied`).
 */
export function sumContractPenalties(
  payments: Array<{ penaltyApplied?: number; contribs?: Array<{ penalty?: number }> }>,
): number {
  return payments.reduce((sum, payment) => {
    const fromContribs = Array.isArray(payment.contribs)
      ? payment.contribs.reduce((acc, contrib) => acc + (Number(contrib?.penalty) || 0), 0)
      : 0
    return sum + (fromContribs > 0 ? fromContribs : Number(payment.penaltyApplied) || 0)
  }, 0)
}
