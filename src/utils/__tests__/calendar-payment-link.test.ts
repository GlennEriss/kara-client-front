import { describe, expect, it } from 'vitest'
import { calendarFocusKey, calendarPaymentHref, getCalendarFocusContractId } from '@/utils/calendar-payment-link'

describe('calendarPaymentHref', () => {
  it('cible le bon onglet, le mois et le versement de caisse spéciale', () => {
    const focus = calendarFocusKey.caisseSpeciale('contract-7', 'payment-42')
    const href = calendarPaymentHref('Caisse Spéciale', new Date('2026-11-30T12:00:00'), focus)

    expect(href).toBe('/calendrier?tab=caisse-speciale&month=2026-11&focus=cs%3Acontract-7%3Apayment-42')
  })

  it('distingue deux contrats importés ayant le même identifiant de paiement', () => {
    const dueAt = new Date('2026-11-30T12:00:00')
    const first = calendarPaymentHref('Caisse Spéciale', dueAt,
      calendarFocusKey.caisseSpeciale('contract-A', 'MK_CS_P_MIG_0'))
    const second = calendarPaymentHref('Caisse Spéciale', dueAt,
      calendarFocusKey.caisseSpeciale('contract-B', 'MK_CS_P_MIG_0'))

    expect(first).not.toBe(second)
  })

  it('identifie précisément une mensualité de crédit', () => {
    const focus = calendarFocusKey.credit('contract-7', 3)
    const href = calendarPaymentHref('Crédit Fixe', new Date('2027-01-05T12:00:00'), focus)

    expect(focus).toBe('credit:contract-7:3')
    expect(href).toContain('tab=credit-fixe')
    expect(href).toContain('month=2027-01')
    expect(href).toContain('focus=credit%3Acontract-7%3A3')
  })
})

describe('contrat ciblé par un lien du calendrier', () => {
  it.each([
    ['cs', 'cs:contract-A:payment-1'],
    ['ci', 'ci:contract-A:0'],
    ['credit', 'credit:contract-A:3'],
    ['placement', 'placement:contract-A:commission-1'],
  ] as const)('extrait le contrat pour %s', (product, focus) => {
    expect(getCalendarFocusContractId(focus, product)).toBe('contract-A')
  })

  it('ignore les liens ambigus, mal formés ou d’un autre produit', () => {
    expect(getCalendarFocusContractId('cs:payment-1', 'cs')).toBeUndefined()
    expect(getCalendarFocusContractId('ci:contract-A:0', 'cs')).toBeUndefined()
    expect(getCalendarFocusContractId('credit:contract-A:NaN', 'credit')).toBeUndefined()
    expect(getCalendarFocusContractId('cs::payment-1', 'cs')).toBeUndefined()
  })
})
