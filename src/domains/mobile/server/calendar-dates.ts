import { getPaymentDueDate } from '@/utils/caisse-imprevue-utils'
import { mobileDateKey } from '../contracts'

/** Présente l'heure civile du Gabon aux helpers date-fns qui utilisent le fuseau
 * local du processus. Les comparaisons de cycles et les fins de mois restent
 * ainsi identiques au navigateur admin, même si le serveur tourne en UTC. */
export function businessWallTime(date: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Libreville', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const number = (type: string) => Number(parts.find(p => p.type === type)?.value)
  return new Date(number('year'), number('month') - 1, number('day'), number('hour'), number('minute'), number('second'), date.getMilliseconds())
}
export function withBusinessDates(value: unknown): unknown {
  if (value instanceof Date) return businessWallTime(value)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(value)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00`)
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : businessWallTime(date)
  }
  if (Array.isArray(value)) return value.map(withBusinessDates)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, withBusinessDates(item)]))
  return value
}
export const civilDayToTimestamp = (date: Date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12))

/** Les helpers métier manipulent des jours locaux. On leur fournit une date civile
 * à midi, puis on sérialise le jour obtenu, indépendamment du fuseau du serveur. */
export function getMobileCIDueDate(contract: { firstPaymentDate?: unknown; paymentFrequency?: string | null }, index: number): Date | null {
  const source = contract.firstPaymentDate
  const parsed = source instanceof Date ? source : typeof source === 'string' ? new Date(source) : null
  if (!parsed || Number.isNaN(parsed.getTime())) return null
  const firstDay = typeof source === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source) ? source : mobileDateKey(parsed)
  const due = getPaymentDueDate({ ...contract, firstPaymentDate: `${firstDay}T12:00:00` }, index)
  return due ? civilDayToTimestamp(due) : null
}
