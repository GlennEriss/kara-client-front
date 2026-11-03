import { describe, expect, it } from 'vitest'
import { calendarContractHref } from '@/utils/calendar-contract-link'
import type { OverdueProduct } from '@/hooks/useOverduePayments'

const products: Array<[OverdueProduct, string, string]> = [
  ['Caisse Spéciale', 'caisseSpeciale.view', '/caisse-speciale/contrats/contract-42'],
  ['Caisse Imprévue', 'caisseImprevue.view', '/caisse-imprevue/contrats/contract-42'],
  ['Crédit Spéciale', 'creditSpeciale.view', '/credit-speciale/contrats/contract-42'],
  ['Crédit Fixe', 'creditFixe.view', '/credit-fixe/contrats/contract-42'],
  ['Crédit Aide', 'creditAide.view', '/credit-aide/contrats/contract-42'],
  ['Placement', 'placements.view', '/placements/contract-42'],
]

describe('liens vers les contrats du calendrier', () => {
  it.each(products)('ouvre la bonne page pour %s avec les accès nécessaires', (product, viewPermission, href) => {
    const permissions = ['calendar.view', 'calendar.contracts', viewPermission]
    expect(calendarContractHref(product, 'contract-42', (key) => permissions.includes(key))).toBe(href)
  })

  it.each(['calendar.view', 'calendar.contracts', 'caisseSpeciale.view'])('masque le lien si %s manque', (missing) => {
    expect(calendarContractHref('Caisse Spéciale', 'contract-42', (key) => key !== missing)).toBeNull()
  })

  it('ne confond pas le droit d’encaisser avec le droit d’ouvrir un contrat', () => {
    const permissions = ['calendar.view', 'calendar.payment']
    expect(calendarContractHref('Caisse Spéciale', 'contract-42', (key) => permissions.includes(key))).toBeNull()
  })

  it('n’ouvre pas un contrat sans identifiant', () => {
    expect(calendarContractHref('Caisse Spéciale', '', () => true)).toBeNull()
  })
})
