// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { eventStatus, isMobileMonth, isMobileModule, mobileDateKey, redactAmounts, type MobileCalendarEvent } from '../contracts'
describe('contrat mobile calendrier', () => {
  it('refuse les mois impossibles et les modules inconnus', () => {
    expect(isMobileMonth('2026-11')).toBe(true)
    expect(isMobileMonth('2026-13')).toBe(false)
    expect(isMobileMonth('2026-00')).toBe(false)
    expect(isMobileMonth('2026-11-01')).toBe(false)
    expect(isMobileModule('caisse-aide')).toBe(true)
    expect(isMobileModule('../users')).toBe(false)
  })
  it('masque toutes les sommes dans le JSON des agents sans changer le statut', () => {
    const event: MobileCalendarEvent = { id: 'e', contractId: 'c', date: '2026-11-17', module: 'caisse-speciale', memberName: 'Membre', label: 'Versement', status: 'overdue', amount: 50000, paidAmount: 10000, remainingAmount: 40000 }
    expect(redactAmounts([event], false)).toEqual([{ ...event, amount: null, paidAmount: null, remainingAmount: null }])
    expect(event.amount).toBe(50000)
    expect(redactAmounts([event], true)[0].amount).toBe(50000)
  })
  it('classe les échéances selon le jour de Libreville', () => {
    expect(mobileDateKey(new Date('2026-11-16T23:30:00Z'))).toBe('2026-11-17')
    expect(eventStatus('PAID', '2026-11-01', '2026-11-17')).toBe('paid')
    expect(eventStatus('PARTIAL', '2026-11-16', '2026-11-17')).toBe('overdue')
    expect(eventStatus('DUE', '2026-11-19', '2026-11-17')).toBe('imminent')
    expect(eventStatus('DUE', '2026-11-20', '2026-11-17')).toBe('upcoming')
    expect(eventStatus('REFUSED', '2026-11-01', '2026-11-17')).toBe('cancelled')
  })
})
