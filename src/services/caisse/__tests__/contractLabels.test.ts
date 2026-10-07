import { describe, expect, it } from 'vitest'
import { formatBonusPeriod, formatContractPeriod } from '../contractLabels'

const base = {
  contractStartAt: new Date('2026-01-10T00:00:00'),
  contractEndAt: new Date('2027-01-09T00:00:00'),
  monthsPlanned: 12,
  caisseType: 'STANDARD',
}

describe('formatContractPeriod', () => {
  it('affiche les deux bornes', () => {
    expect(formatContractPeriod(base)).toBe('du 10/01/2026 au 09/01/2027')
  })

  it('recalcule la fin quand elle manque', () => {
    const { contractEndAt: _omis, ...sansFin } = base
    expect(formatContractPeriod(sansFin)).toBe('du 10/01/2026 au 10/01/2027')
  })

  it('ne rend rien sans date de début exploitable', () => {
    expect(formatContractPeriod({ ...base, contractStartAt: null, firstPaymentDate: null })).toBeUndefined()
  })
})

describe('formatBonusPeriod', () => {
  // Contrat démarré il y a longtemps : les mois écoulés ne plafonnent rien,
  // seul le nombre de mois soldés compte dans ces cas.
  const old = { ...base, contractStartAt: new Date('2024-01-10T00:00:00') }

  it('annonce le point de départ tant que le bonus ne court pas', () => {
    expect(formatBonusPeriod({ ...old, currentMonthIndex: 0 }))
      .toBe('0 mois complet retenu depuis le 10/01/2024 · bonus dès 4 mois complets')
    expect(formatBonusPeriod({ ...old, currentMonthIndex: 3 }))
      .toBe('3 mois complets retenus depuis le 10/01/2024 · bonus dès 4 mois complets')
  })

  it('affiche le taux du nombre de mois complets retenus', () => {
    expect(formatBonusPeriod({ ...old, currentMonthIndex: 4 }))
      .toBe('4 mois complets retenus depuis le 10/01/2024 · taux M4')
    expect(formatBonusPeriod({ ...old, currentMonthIndex: 12 }))
      .toBe('12 mois complets retenus depuis le 10/01/2024 · taux M12')
  })

  it('accorde le singulier', () => {
    expect(formatBonusPeriod({ ...old, currentMonthIndex: 1 }))
      .toBe('1 mois complet retenu depuis le 10/01/2024 · bonus dès 4 mois complets')
  })

  it('plafonne au temps écoulé : payer d\u2019avance ne monte pas le taux', () => {
    const recent = { ...base, contractStartAt: new Date() }
    // 10 mois soldés mais le contrat vient de démarrer : aucun mois complet.
    expect(formatBonusPeriod({ ...recent, currentMonthIndex: 10 }))
      .toContain('0 mois complet retenu')
  })

  it('se passe de la date de début si elle manque', () => {
    // Sans date, le mois soldé N est supposé en cours : N - 1 mois complets.
    expect(formatBonusPeriod({ contractStartAt: null, firstPaymentDate: null, currentMonthIndex: 5 }))
      .toBe('4 mois complets retenus · taux M4')
  })
})
