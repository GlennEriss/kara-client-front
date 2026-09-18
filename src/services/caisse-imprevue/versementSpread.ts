/**
 * Répartition d'un versement de Caisse Imprévue sur plusieurs mois.
 *
 * Un versement journalier peut dépasser l'objectif du mois en cours. Le surplus
 * doit alimenter le mois suivant, et ainsi de suite, plutôt que de gonfler le
 * mois courant au-delà de sa cible — sinon le contrat affiche un mois « payé »
 * à 150 % pendant que le suivant reste vide.
 *
 * Fonction pure, isolée du dépôt Firestore pour rester testable.
 */

export interface VersementSpreadInput {
  /** Nombre de mois du contrat. */
  duration: number
  /** Objectif mensuel par défaut (montant du forfait). */
  monthlyTarget: number
  /** Mois déjà connus : objectif éventuellement spécifique et cumul atteint. */
  months: { monthIndex: number; targetAmount?: number; accumulatedAmount?: number }[]
  /** Mois de saisie du versement. */
  startMonthIndex: number
  /** Montant à répartir (après déduction d'un éventuel remboursement de support). */
  amount: number
}

export interface VersementSlice {
  monthIndex: number
  amount: number
}

export interface VersementSpreadResult {
  /** Une entrée par mois crédité, dans l'ordre chronologique. */
  slices: VersementSlice[]
  /** Reliquat que le contrat ne peut pas absorber (0 si tout passe). */
  overflow: number
  /** Montant total encore acceptable à partir du mois de saisie. */
  capacity: number
}

export function planVersementSpread({
  duration,
  monthlyTarget,
  months,
  startMonthIndex,
  amount,
}: VersementSpreadInput): VersementSpreadResult {
  const byIndex = new Map(months.map((m) => [m.monthIndex, m]))

  const slices: VersementSlice[] = []
  let remaining = Math.max(0, amount)
  let capacity = 0

  for (let month = startMonthIndex; month < duration; month++) {
    const known = byIndex.get(month)
    // L'objectif enregistré sur le mois fait foi s'il existe : le forfait a pu
    // changer en cours de contrat.
    const target = known?.targetAmount ?? monthlyTarget
    const free = Math.max(0, target - (known?.accumulatedAmount ?? 0))
    capacity += free

    if (remaining <= 0 || free <= 0) continue

    const take = Math.min(remaining, free)
    slices.push({ monthIndex: month, amount: take })
    remaining -= take
  }

  return { slices, overflow: Math.max(0, remaining), capacity }
}
