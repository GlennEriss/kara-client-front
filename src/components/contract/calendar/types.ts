/**
 * Statut d'un jour dans le calendrier des versements (caisse spéciale journalier).
 */
export type CalendarDayStatus = 'unavailable' | 'paid' | 'due' | 'upcoming'

/**
 * Un jour du calendrier avec son statut et le paiement associé (si versé).
 */
export interface DayWithStatus {
  date: Date
  status: CalendarDayStatus
  payment: unknown | null
  isToday: boolean
}

export const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
] as const
