import { fromFirestore } from '@/domains/mobile/server/calendar-service'

export function normalizeFinanceDates<T>(value: T): T {
  return fromFirestore(value) as T
}
/** Preserve nested contribution/support timestamps as ISO dates on the wire. */
export function serializeFinanceValue(value: unknown) {
  return JSON.parse(JSON.stringify(normalizeFinanceDates(value ?? null)))
}
