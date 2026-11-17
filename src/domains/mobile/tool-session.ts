import { z } from 'zod'
import { MOBILE_MODULES } from './contracts'
import { DASHBOARD_TAB_KEYS } from '@/domains/dashboard/entities/dashboard-tabs.types'
import { calendarFocusKey } from '@/utils/calendar-payment-link'

const identifier = z.string().min(1).max(180).regex(/^[^/:\\?#]+$/)
  .refine(value => value !== '.' && value !== '..' && !Array.from(value).some(char => char.charCodeAt(0) < 32))
const date = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
})
export const toolRequestSchema = z.object({
  target: z.enum(['calendar', 'calls', 'dashboard', 'contract']),
  module: z.enum(MOBILE_MODULES).optional(),
  eventId: z.string().min(1).max(550).optional(),
  contractId: identifier.optional(),
  date: date.optional(),
  tab: z.enum(DASHBOARD_TAB_KEYS).optional(),
  period: z.enum(['all', 'today', '7d', '30d', 'month']).optional(),
}).strict()
export type ToolRequest = z.infer<typeof toolRequestSchema>

/** Aucun URL ni droit fourni par le téléphone n'est accepté. */
export function toolCalendarPath(input: ToolRequest): string {
  const module = input.module ?? 'caisse-speciale'
  const params = new URLSearchParams({ tab: module })
  if (input.date) params.set('month', input.date.slice(0, 7))
  if (input.eventId) {
    const parts = input.eventId.split(':')
    if (parts.length !== 3 || parts[0] !== module || !identifier.safeParse(parts[1]).success || !identifier.safeParse(parts[2]).success)
      throw new Error('Échéance invalide.')
    const [, contractId, key] = parts
    if (input.contractId && input.contractId !== contractId) throw new Error('Contrat incohérent.')
    let focus: string
    if (module === 'caisse-speciale') focus = calendarFocusKey.caisseSpeciale(contractId, key)
    else if (module === 'caisse-imprevue') {
      if (!/^\d+$/.test(key)) throw new Error('Échéance invalide.')
      focus = calendarFocusKey.caisseImprevue(contractId, Number(key))
    } else if (module === 'placement') focus = calendarFocusKey.placement(contractId, key)
    else {
      const match = key.match(/-M([1-9]\d*)$/)
      if (!match || key !== `${contractId}-M${match[1]}`) throw new Error('Échéance de crédit invalide.')
      focus = calendarFocusKey.credit(contractId, Number(match[1]))
    }
    params.set('focus', focus)
  }
  return `/calendrier?${params}${input.target === 'calls' ? '#call-plan' : ''}`
}
export function toolDashboardPath(input: ToolRequest): string {
  return `/dashboard?${new URLSearchParams({ tab: input.tab ?? 'executive', period: input.period ?? 'month' })}`
}
