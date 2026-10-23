import { FINANCIAL_REPORT_MAX_MONTHS, type MonthKey } from '../entities/financial-report.types'

/** Libreville : UTC+1 toute l'année (pas d'heure d'été). */
const LIBREVILLE_OFFSET_MS = 60 * 60 * 1000

const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/
const DATE_STRING_PATTERN = /^(\d{4})-(\d{2})-\d{2}/

const MONTH_NAMES = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

export function isMonthKey(value: unknown): value is MonthKey {
  if (typeof value !== 'string') return false
  const match = value.match(MONTH_KEY_PATTERN)
  return !!match && Number(match[2]) >= 1 && Number(match[2]) <= 12
}

/** Date (objet, Timestamp, nombre ou chaîne) → `Date`, ou `null` si illisible. */
export function toReportDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate()
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

/** Mois d'une date, à l'heure de Libreville. Une chaîne `YYYY-MM-DD` est lue telle quelle. */
export function monthKeyOf(value: unknown): MonthKey | null {
  if (typeof value === 'string') {
    const match = value.match(DATE_STRING_PATTERN)
    if (match) return `${match[1]}-${match[2]}`
  }
  const date = toReportDate(value)
  if (!date) return null
  const local = new Date(date.getTime() + LIBREVILLE_OFFSET_MS)
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}`
}

export function addMonthsToKey(key: MonthKey, count: number): MonthKey {
  const [year, month] = key.split('-').map(Number)
  const index = year * 12 + (month - 1) + count
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

/** Mois de `from` à `to` inclus. */
export function listMonths(from: MonthKey, to: MonthKey): MonthKey[] {
  const months: MonthKey[] = []
  for (let key = from; key <= to && months.length < FINANCIAL_REPORT_MAX_MONTHS; key = addMonthsToKey(key, 1)) {
    months.push(key)
  }
  return months
}

export function monthLabel(key: MonthKey): string {
  const [year, month] = key.split('-').map(Number)
  return `${MONTH_NAMES[month - 1]} ${year}`
}

export function currentMonthKey(now: Date = new Date()): MonthKey {
  return monthKeyOf(now) as MonthKey
}
