/**
 * Utilitaires pour les mois de repos (Crédit Spéciale).
 * Le mois logique = ordre de l'échéance due ; il sert à appliquer la règle « plus d'intérêts après le 7e mois ».
 */

import type { RestMonth } from '@/types/types'

/**
 * Indique si le mois calendaire donné est en repos.
 */
export function isRestMonth(
  monthNumber: number,
  restMonths: RestMonth[] | undefined
): boolean {
  if (!restMonths?.length) return false
  return restMonths.some((r) => r.monthNumber === monthNumber)
}

/**
 * Retourne l'index du mois logique (1-based) pour un mois calendaire donné.
 * Mois logique = mois calendaire − nombre de mois de repos parmi les mois 1..monthNumber.
 * Ex. : mois calendaire 3 avec repos aux mois 1 et 2 → mois logique = 3 − 2 = 1.
 */
export function getLogicalMonthIndex(
  calendarMonthNumber: number,
  restMonths: RestMonth[] | undefined
): number {
  if (!restMonths?.length) return calendarMonthNumber
  const restCount = restMonths.filter((r) => r.monthNumber <= calendarMonthNumber).length
  return calendarMonthNumber - restCount
}

/**
 * Retourne true si on est au-delà du 7e mois logique (plus d'intérêts à partir du 8e).
 */
export function isAfterLogicalMonth7(
  calendarMonthNumber: number,
  restMonths: RestMonth[] | undefined
): boolean {
  return getLogicalMonthIndex(calendarMonthNumber, restMonths) > 7
}
