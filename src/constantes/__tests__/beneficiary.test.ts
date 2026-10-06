import { describe, expect, it } from 'vitest'
import { formatBeneficiary, resolveBeneficiary, UNKNOWN_BENEFICIARY, withResolvedBeneficiary } from '../beneficiary'

describe('ayant droit', () => {
  it('enregistre le membre choisi', () => {
    expect(resolveBeneficiary({ matricule: '1228.MK.0058', lastName: 'MBOUMBA', firstName: 'Jean' })).toEqual({
      matricule: '1228.MK.0058',
      lastName: 'MBOUMBA',
      firstName: 'Jean',
      isUnknown: false,
    })
  })

  it('enregistre INCONNU sans ayant droit ou avec un matricule invalide', () => {
    expect(resolveBeneficiary(undefined)).toEqual(UNKNOWN_BENEFICIARY)
    expect(resolveBeneficiary({ matricule: '' })).toEqual(UNKNOWN_BENEFICIARY)
    expect(resolveBeneficiary({ matricule: 'abc' })).toEqual(UNKNOWN_BENEFICIARY)
  })

  it('remplace une ancienne personne non membre par INCONNU', () => {
    const identity = withResolvedBeneficiary({ beneficiary: { lastName: 'NZE', phone: '+24166000000' } })
    expect(identity.beneficiary).toEqual(UNKNOWN_BENEFICIARY)
  })

  it("s'affiche avec le nom et le matricule, ou INCONNU", () => {
    expect(formatBeneficiary({ matricule: '1228.MK.0058', lastName: 'MBOUMBA', firstName: 'Jean' })).toBe('MBOUMBA Jean (1228.MK.0058)')
    expect(formatBeneficiary(UNKNOWN_BENEFICIARY)).toBe('INCONNU')
  })
})
