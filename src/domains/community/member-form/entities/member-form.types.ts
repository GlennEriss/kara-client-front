/**
 * Régularité de paiement d'un membre — le « form guide » façon résultats
 * sportifs : les dernières échéances passées, chacune réduite à un résultat
 * lisible d'un coup d'œil.
 *
 * Ne juge que ce qui est factuel : une échéance était due à une date, elle a été
 * honorée ou non. Aucune pondération, aucune note composite — le Crédit Spécial
 * a déjà son propre score (`calculateInitialScore`), et deux notations
 * concurrentes sur le même membre seraient ingérables. Cette bande éclaire le
 * score, elle ne le remplace pas.
 */

/** Nombre d'échéances affichées par défaut. */
export const MEMBER_FORM_LENGTH = 10

export type MemberFormOutcome =
  /** Honorée au plus tard le jour de l'échéance. */
  | 'onTime'
  /** Honorée, mais après l'échéance. */
  | 'late'
  /** Échéance passée, toujours impayée. */
  | 'missed'
  /** Report accordé (mois de repos) : ce n'est pas une faute. */
  | 'excused'

export type MemberFormProduct =
  | 'Caisse Spéciale'
  | 'Caisse Imprévue'
  | 'Crédit Spéciale'
  | 'Crédit Fixe'
  | 'Crédit Aide'

/** Une échéance passée et son issue. */
export interface MemberFormEntry {
  key: string
  product: MemberFormProduct
  dueAt: Date
  paidAt: Date | null
  amount: number
  outcome: MemberFormOutcome
  /** Jours de retard, positif seulement pour `late` et `missed`. */
  daysLate: number
  /** Contrat à l'origine de l'échéance, pour ouvrir son détail depuis la fiche membre. */
  contractId?: string
  contractHref?: string
  /** Libellé métier optionnel, par exemple « Échéance 3 » ou « Cycle 2 · M1 ». */
  label?: string
}

export interface MemberFormSummary {
  memberId: string
  /** Les plus récentes d'abord. */
  entries: MemberFormEntry[]
  onTimeCount: number
  lateCount: number
  missedCount: number
  excusedCount: number
  /** Échéances jugées, hors reports accordés. */
  ratedCount: number
  /** Part d'échéances à l'heure, sur les seules échéances jugées. `null` si aucune. */
  punctualityRate: number | null
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Différence en jours pleins, en ignorant les heures. */
export function daysBetween(from: Date, to: Date): number {
  const fromDay = startOfDay(from)
  const toDay = startOfDay(to)
  // Date.UTC évite qu'un changement d'heure transforme une journée civile en
  // 23 ou 25 heures sur les postes configurés dans un autre fuseau.
  const fromUtc = Date.UTC(fromDay.getFullYear(), fromDay.getMonth(), fromDay.getDate())
  const toUtc = Date.UTC(toDay.getFullYear(), toDay.getMonth(), toDay.getDate())
  const ms = toUtc - fromUtc
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

/**
 * Issue d'une échéance.
 *
 * Le jour de l'échéance compte comme à l'heure : un versement effectué le jour
 * même n'est pas un retard. Tout dépassement, même d'un jour, est un retard —
 * pas de tolérance implicite, le nombre de jours reste consultable.
 */
export function resolveOutcome(params: {
  dueAt: Date
  paidAt?: Date | null
  isExcused?: boolean
  now?: Date
}): { outcome: MemberFormOutcome; daysLate: number } {
  if (params.isExcused) return { outcome: 'excused', daysLate: 0 }

  const now = params.now ?? new Date()

  if (params.paidAt) {
    const daysLate = daysBetween(params.dueAt, params.paidAt)
    return daysLate > 0 ? { outcome: 'late', daysLate } : { outcome: 'onTime', daysLate: 0 }
  }

  // Impayée : elle ne compte que si l'échéance est réellement passée.
  const daysLate = daysBetween(params.dueAt, now)
  return daysLate > 0 ? { outcome: 'missed', daysLate } : { outcome: 'onTime', daysLate: 0 }
}

/**
 * Synthèse à partir d'échéances déjà résolues.
 *
 * Les échéances non encore arrivées à terme sont écartées par l'appelant : une
 * échéance future n'est pas un résultat.
 */
export function buildMemberFormSummary(params: {
  memberId: string
  entries: MemberFormEntry[]
  length?: number
}): MemberFormSummary {
  const length = params.length ?? MEMBER_FORM_LENGTH

  const entries = [...params.entries]
    .sort((a, b) => b.dueAt.getTime() - a.dueAt.getTime())
    .slice(0, length)

  const onTimeCount = entries.filter((e) => e.outcome === 'onTime').length
  const lateCount = entries.filter((e) => e.outcome === 'late').length
  const missedCount = entries.filter((e) => e.outcome === 'missed').length
  const excusedCount = entries.filter((e) => e.outcome === 'excused').length
  const ratedCount = onTimeCount + lateCount + missedCount

  return {
    memberId: params.memberId,
    entries,
    onTimeCount,
    lateCount,
    missedCount,
    excusedCount,
    ratedCount,
    punctualityRate: ratedCount > 0 ? onTimeCount / ratedCount : null,
  }
}
