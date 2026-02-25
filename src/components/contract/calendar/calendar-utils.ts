/**
 * Utilitaires pour la grille du calendrier (mois affiché, jours avec padding).
 */

/**
 * Retourne les jours à afficher dans la grille : début du mois aligné sur dimanche,
 * jusqu'à remplir au moins 6 semaines (42 cellules).
 */
export function getMonthDays(month: Date): Date[] {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDay = new Date(year, monthIndex, 1)
  const lastDay = new Date(year, monthIndex + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  const days: Date[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= lastDay || days.length < 42) {
    days.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return days
}

/**
 * Normalise une date (Timestamp Firestore, Date, ou string) en Date à minuit.
 */
export function toDateSafe(v: unknown): Date | null {
  try {
    if (!v) return null
    if (v instanceof Date) {
      const d = new Date(v.getTime())
      d.setHours(0, 0, 0, 0)
      return isNaN(d.getTime()) ? null : d
    }
    if (typeof (v as { toDate?: () => Date })?.toDate === 'function') {
      const d = (v as { toDate: () => Date }).toDate()
      d.setHours(0, 0, 0, 0)
      return isNaN(d.getTime()) ? null : d
    }
    const d = new Date(v as string | number)
    d.setHours(0, 0, 0, 0)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}
