/** Contrat JSON consommé par le projet kara-admin-mobile, sans document Firestore brut. */
export const MOBILE_MODULES = ['caisse-speciale', 'caisse-imprevue', 'credit-speciale', 'credit-fixe', 'caisse-aide', 'placement'] as const
export type MobileModule = (typeof MOBILE_MODULES)[number]
export type MobileEventStatus = 'paid' | 'overdue' | 'imminent' | 'upcoming' | 'partial' | 'cancelled'
export interface MobileCalendarEvent {
  id: string
  contractId: string
  date: string
  module: MobileModule
  memberName: string
  label: string
  status: MobileEventStatus
  amount: number | null
  paidAmount: number | null
  remainingAmount: number | null
  contractType?: string
}

export function isMobileModule(value: unknown): value is MobileModule {
  return typeof value === 'string' && MOBILE_MODULES.includes(value as MobileModule)
}
export function isMobileMonth(value: unknown): value is string {
  return typeof value === 'string' && /^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(value)
}
export function mobileDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Libreville', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const part = (type: string) => parts.find(p => p.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}
export function eventStatus(raw: string, date: string, today: string, partial = false): MobileEventStatus {
  if (['PAID', 'Paid'].includes(raw)) return 'paid'
  if (['REFUSED', 'Canceled', 'CANCELLED', 'PENDING'].includes(raw)) return 'cancelled'
  if (raw === 'OVERDUE' || date < today) return 'overdue'
  if (partial || ['PARTIAL', 'Partial'].includes(raw)) return 'partial'
  const distance = (Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000
  return distance <= 2 ? 'imminent' : 'upcoming'
}
export function redactAmounts(events: MobileCalendarEvent[], canSeeAmounts: boolean): MobileCalendarEvent[] {
  return canSeeAmounts ? events : events.map(event => ({ ...event, amount: null, paidAmount: null, remainingAmount: null }))
}
