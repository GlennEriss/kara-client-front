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
 * D'où `min(mois écoulés, mois soldés)`. Cette règle vivait uniquement dans le
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
  /** Date de référence, pour les tests. */
  now?: Date
}

export interface BonusResult {
  /** Mois retenu : `min(écoulés, soldés)`. */
  monthCount: number
  /** Taux appliqué, en pourcentage (0 si le seuil n'est pas atteint). */
  ratePercent: number
  /** Libellé du mois dont le taux est appliqué, ex. « M4 ». */
  rateLabel?: string
  /** Montant du bonus, arrondi à l'unité. */
  amount: number
}

export function computeContractBonus({
  contractStartAt,
  paidMonthsCount,
  totalPaid,
  settings,
  now = new Date(),
}: BonusInput): BonusResult {
  const paidCount = Math.max(0, Math.floor(paidMonthsCount || 0))

  const start = contractStartAt ? new Date(contractStartAt) : null
  const elapsedMonthNumber =
    start && !Number.isNaN(start.getTime()) ? contractMonthNumberAt(start, now) : paidCount

  const monthCount = Math.min(elapsedMonthNumber, paidCount)

  // Le taux appliqué est celui du mois PRÉCÉDENT : au mois 5, le taux M4.
  const rateIndex = monthCount - 2
  const ratePercent = rateIndex >= 0 ? computeBonus(rateIndex, settings) || 0 : 0

  if (rateIndex + 1 < BONUS_FIRST_RATE_MONTH || ratePercent <= 0) {
    return { monthCount, ratePercent: 0, amount: 0 }
  }

  return {
    monthCount,
    ratePercent,
    rateLabel: `M${rateIndex + 1}`,
    amount: Math.round((totalPaid || 0) * (ratePercent / 100)),
  }
}
