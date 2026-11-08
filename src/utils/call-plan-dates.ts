import { addDays, addWeeks, format, startOfWeek } from 'date-fns'

/** Jour métier au Gabon, indépendant du fuseau de l'appareil. */
export function callPlanToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Africa/Libreville', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type: string) => parts.find((value) => value.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function isValidCallPlanDate(value: string, today = callPlanToday()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime()) && format(date, 'yyyy-MM-dd') === value && value >= today
}

export function callPlanDateShortcuts(today = callPlanToday()) {
  const date = new Date(`${today}T12:00:00`)
  return [
    { label: 'Aujourd’hui', value: today },
    { label: 'Demain', value: format(addDays(date, 1), 'yyyy-MM-dd') },
    { label: 'Semaine prochaine', value: format(addWeeks(startOfWeek(date, { weekStartsOn: 1 }), 1), 'yyyy-MM-dd') },
  ]
}
