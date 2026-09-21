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
  it('annonce le point de départ tant que le bonus ne court pas', () => {
    expect(formatBonusPeriod({ ...base, currentMonthIndex: 0 }))
      .toBe('0 mois retenu depuis le 10/01/2026 · bonus dès le mois 5')
    expect(formatBonusPeriod({ ...base, currentMonthIndex: 4 }))
      .toBe('4 mois retenus depuis le 10/01/2026 · bonus dès le mois 5')
  })

  it('affiche le taux appliqué dès que le bonus court', () => {
    expect(formatBonusPeriod({ ...base, currentMonthIndex: 5 }))
      .toBe('5 mois retenus depuis le 10/01/2026 · taux M4')
    expect(formatBonusPeriod({ ...base, currentMonthIndex: 8 }))
      .toBe('8 mois retenus depuis le 10/01/2026 · taux M7')
  })

  it('accorde le singulier', () => {
    expect(formatBonusPeriod({ ...base, currentMonthIndex: 1 }))
      .toBe('1 mois retenu depuis le 10/01/2026 · bonus dès le mois 5')
  })

  it('plafonne au temps écoulé : payer d\u2019avance ne monte pas le taux', () => {
    const recent = { ...base, contractStartAt: new Date() }
    // 10 mois soldés mais le contrat vient de démarrer : 1 mois retenu.
    expect(formatBonusPeriod({ ...recent, currentMonthIndex: 10 }))
      .toContain('1 mois retenu')
  })

  it('se passe de la date de début si elle manque', () => {
    expect(formatBonusPeriod({ contractStartAt: null, firstPaymentDate: null, currentMonthIndex: 5 }))
      .toBe('5 mois retenus · taux M4')
  })
})
