/**
 * Détection des échéances en retard d'un contrat de Caisse Imprévue.
 *
 * Deux pièges que cette fonction évite :
 *
 * 1. **Les échéances ne sont pas pré-créées.** La sous-collection `payments`
 *    ne reçoit un document qu'au premier versement du mois. Se contenter des
 *    documents existants laisse échapper les contrats où rien n'a jamais été
 *    payé — les plus en retard. On reconstruit donc l'échéancier complet et on
 *    traite l'absence de document comme un mois entièrement dû.
 *
 * 2. **Un mois « à zéro » n'est pas un retard s'il n'est pas échu.** Seules
 *    comptent les échéances dont la date est passée.
 *
 * Fonction pure, sans accès Firestore, pour rester testable et partageable
 * entre le dépôt (onglet Retard) et les écrans de suivi.
 */

import { getPaymentDueDate } from '@/utils/caisse-imprevue-utils'

/** Le strict nécessaire : accepte aussi bien un `ContractCI` qu'un extrait. */
export interface OverdueContractInput {
  firstPaymentDate?: unknown
  paymentFrequency?: string | null
  subscriptionCIDuration?: number | null
  subscriptionCIAmountPerMonth?: number | null
}

/** Document de versement mensuel, tel que stocké. */
export interface OverduePaymentInput {
  monthIndex?: number | null
  status?: string | null
  targetAmount?: number | null
  accumulatedAmount?: number | null
}

export interface OverdueMonth {
  monthIndex: number
  dueAt: Date
  /** Reste à payer sur ce mois. */
  remaining: number
  daysLate: number
}

export interface OverdueDetectionOptions {
  /** Date de référence (par défaut : maintenant). */
  today?: Date
  /**
   * Profondeur retenue, en mois. Une échéance plus ancienne est ignorée :
   * l'onglet Retard suit l'année écoulée, pas l'historique complet.
   */
  monthsBack?: number
}

/** Fenêtre par défaut : les douze derniers mois. */
export const DEFAULT_OVERDUE_MONTHS_BACK = 12

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Échéances impayées et échues, de la plus ancienne à la plus récente.
 * Tableau vide = contrat à jour sur la fenêtre observée.
 */
export function findOverdueMonths(
  contract: OverdueContractInput,
  payments: OverduePaymentInput[],
  { today = new Date(), monthsBack = DEFAULT_OVERDUE_MONTHS_BACK }: OverdueDetectionOptions = {},
): OverdueMonth[] {
  const duration = contract.subscriptionCIDuration || 0
  const monthlyTarget = contract.subscriptionCIAmountPerMonth || 0
  if (duration <= 0) return []

  const reference = startOfDay(today)
  const windowStart = startOfDay(today)
  windowStart.setMonth(windowStart.getMonth() - monthsBack)

  const byIndex = new Map<number, OverduePaymentInput>()
  for (const payment of payments) {
    if (typeof payment?.monthIndex === 'number') byIndex.set(payment.monthIndex, payment)
  }

  const overdue: OverdueMonth[] = []

  for (let monthIndex = 0; monthIndex < duration; monthIndex++) {
    const payment = byIndex.get(monthIndex)
    const target = payment?.targetAmount ?? monthlyTarget
    const accumulated = payment?.accumulatedAmount ?? 0

    // Mois soldé : par statut explicite ou par cumul atteint.
    if (payment?.status === 'PAID' || (target > 0 && accumulated >= target)) continue

    const dueAt = getPaymentDueDate(contract, monthIndex)
    if (!dueAt) continue

    const due = startOfDay(dueAt)
    if (due >= reference) continue // pas encore échue
    if (due < windowStart) continue // hors de la fenêtre observée

    overdue.push({
      monthIndex,
      dueAt: due,
      remaining: Math.max(0, target - accumulated),
      daysLate: Math.floor((reference.getTime() - due.getTime()) / 86_400_000),
    })
  }

  return overdue
}

/** Raccourci : le contrat a-t-il au moins une échéance en retard ? */
export function hasOverdueMonths(
  contract: OverdueContractInput,
  payments: OverduePaymentInput[],
  options?: OverdueDetectionOptions,
): boolean {
  return findOverdueMonths(contract, payments, options).length > 0
}

/** Trois chiffres qui résument un retard, pour l'affichage. */
export interface OverdueSummary {
  /** Nombre d'échéances impayées. */
  count: number
  /** Total restant dû sur ces échéances. */
  totalDue: number
  /** Jours écoulés depuis l'échéance la plus ancienne. */
  maxDaysLate: number
}

/** `null` si le contrat est à jour sur la fenêtre observée. */
export function summarizeOverdue(months: OverdueMonth[]): OverdueSummary | null {
  if (months.length === 0) return null
  return {
    count: months.length,
    totalDue: months.reduce((sum, m) => sum + m.remaining, 0),
    maxDaysLate: months.reduce((max, m) => Math.max(max, m.daysLate), 0),
  }
}
