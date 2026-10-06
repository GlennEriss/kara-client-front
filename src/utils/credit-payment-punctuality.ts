/**
 * Ponctualité des versements d'un crédit : compare la date du versement à la
 * date d'échéance, avec la même tolérance que les pénalités (3 jours de retard
 * sans pénalité, voir CreditSpecialeService.checkAndCreatePenalties).
 */

export const LATE_TOLERANCE_DAYS = 3

export type PaymentPunctuality = 'ON_TIME' | 'GRACE' | 'LATE' | 'OVERDUE' | 'UPCOMING' | 'REST'

export const PUNCTUALITY_META: Record<
  PaymentPunctuality,
  { label: string; badge: string; border: string; dot: string }
> = {
  ON_TIME: { label: 'À temps', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'border-l-emerald-500', dot: 'bg-emerald-500' },
  GRACE: { label: 'Retard toléré', badge: 'bg-yellow-50 text-yellow-800 border-yellow-300', border: 'border-l-yellow-400', dot: 'bg-yellow-400' },
  LATE: { label: 'En retard', badge: 'bg-orange-50 text-orange-700 border-orange-200', border: 'border-l-orange-500', dot: 'bg-orange-500' },
  OVERDUE: { label: 'Impayé', badge: 'bg-red-50 text-red-700 border-red-200', border: 'border-l-red-500', dot: 'bg-red-500' },
  UPCOMING: { label: 'À venir', badge: 'bg-gray-50 text-gray-600 border-gray-200', border: 'border-l-gray-300', dot: 'bg-gray-300' },
  REST: { label: 'Repos', badge: 'bg-blue-50 text-blue-700 border-blue-200', border: 'border-l-blue-400', dot: 'bg-blue-400' },
}

/** Ordre de la légende. */
export const PUNCTUALITY_LEGEND: PaymentPunctuality[] = ['ON_TIME', 'GRACE', 'LATE', 'OVERDUE', 'UPCOMING', 'REST']

const startOfDay = (value: Date | string) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

/** Jours calendaires de retard (0 si versé le jour de l'échéance ou avant). */
export function daysLateBetween(dueDate: Date | string, paymentDate: Date | string): number {
  const diff = Math.round((startOfDay(paymentDate).getTime() - startOfDay(dueDate).getTime()) / 86_400_000)
  return Math.max(0, diff)
}

/** Ponctualité d'un versement effectué. */
export function getPaymentPunctuality(dueDate: Date | string, paymentDate: Date | string) {
  const daysLate = daysLateBetween(dueDate, paymentDate)
  const kind: PaymentPunctuality = daysLate === 0 ? 'ON_TIME' : daysLate <= LATE_TOLERANCE_DAYS ? 'GRACE' : 'LATE'
  return { kind, daysLate }
}

/**
 * Ponctualité d'une échéance de l'historique : payée (selon la date du
 * versement qui l'a soldée), en repos, impayée après la date, ou à venir.
 */
export function getInstallmentPunctuality(
  row: { date: Date | string; status: 'PAID' | 'DUE' | 'FUTURE' | 'REST'; isRest?: boolean; paymentDate?: Date | string },
  today: Date = new Date(),
): { kind: PaymentPunctuality; daysLate: number } {
  if (row.isRest || row.status === 'REST') return { kind: 'REST', daysLate: 0 }
  if (row.status === 'PAID') {
    return row.paymentDate ? getPaymentPunctuality(row.date, row.paymentDate) : { kind: 'ON_TIME', daysLate: 0 }
  }
  const daysLate = daysLateBetween(row.date, today)
  return daysLate > 0 ? { kind: 'OVERDUE', daysLate } : { kind: 'UPCOMING', daysLate: 0 }
}

/** Libellé affiché, avec le nombre de jours quand il y a du retard. */
export function punctualityLabel(kind: PaymentPunctuality, daysLate: number): string {
  const base = PUNCTUALITY_META[kind].label
  return daysLate > 0 && kind !== 'UPCOMING' && kind !== 'REST' ? `${base} (${daysLate} j)` : base
}
