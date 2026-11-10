import type { CreditPenalty } from '@/types/types'

/** Les clés d'échéance existent avec ou sans suffixe d'identifiant de contrat. */
export function parseCreditInstallmentReference(ref?: string): { cycleNumber?: number; monthNumber?: number } {
  const value = ref?.trim() ?? ''
  const cycle = value.match(/^C([1-9]\d*)_M([1-9]\d*)(?:_|$)/)
  if (cycle) return { cycleNumber: Number(cycle[1]), monthNumber: Number(cycle[2]) }
  const legacy = value.match(/^M([1-9]\d*)(?:_|$)/)
  return legacy ? { cycleNumber: 1, monthNumber: Number(legacy[1]) } : {}
}

const businessDay = (value: Date): string | null => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('fr-CA', { timeZone: 'Africa/Libreville' })
}

/**
 * La référence (cycle, mois) prime sur la date : d'anciennes échéances stockées
 * à minuit dans un autre fuseau peuvent différer d'un jour du calendrier actuel.
 * Sans référence exploitable, seul un jour identique permet le rattachement.
 */
export function findCreditPenaltyHistoryRow<T extends { cycleNumber: number; cycleMonth: number; date: Date }>(
  penalty: Pick<CreditPenalty, 'dueDate'> & Partial<Pick<CreditPenalty, 'installmentId'>>,
  rows: T[],
): T | undefined {
  const { cycleNumber, monthNumber } = parseCreditInstallmentReference(penalty.installmentId)
  if (cycleNumber && monthNumber)
    return rows.find(row => row.cycleNumber === cycleNumber && row.cycleMonth === monthNumber)
  const day = businessDay(penalty.dueDate)
  return day ? rows.find(row => businessDay(row.date) === day) : undefined
}
