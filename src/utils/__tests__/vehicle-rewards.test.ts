import { describe, expect, it } from 'vitest'
import type { VehicleInsurancePartner } from '@/types/types'
import {
  computeVehicleReward,
  findInsurancePartner,
  memberShareOf,
  resolveRewardBeneficiary,
} from '@/utils/vehicle-rewards'

const partners = [
  { id: 'p1', name: 'Assinco Gabon', commissionRate: 10, memberSharePercent: 30 },
] as VehicleInsurancePartner[]

describe('reversement assurance véhicule', () => {
  it('retrouve l’assureur sans tenir compte des accents ni de la casse', () => {
    expect(findInsurancePartner(partners, 'ASSINCO-gabon')?.id).toBe('p1')
    expect(findInsurancePartner(partners, 'Autre')).toBeUndefined()
  })

  it('calcule la commission attendue et la part du parrain', () => {
    expect(computeVehicleReward(250_000, partners[0])).toEqual({ expectedCommission: 25_000, memberAmount: 7_500 })
    expect(memberShareOf(20_000, 30)).toBe(6_000)
  })

  it('reverse au parrain, y compris quand le titulaire se parraine lui-même', () => {
    expect(
      resolveRewardBeneficiary({
        holderType: 'member',
        memberId: 'm1',
        memberFirstName: 'Awa',
        memberLastName: 'N.',
        sponsorMemberId: 'm1',
        sponsorName: 'N. Awa',
      }),
    ).toMatchObject({ id: 'm1', name: 'N. Awa' })
    expect(
      resolveRewardBeneficiary({
        holderType: 'member',
        memberId: 'm1',
        sponsorMemberId: 's2',
        sponsorName: 'Paul',
      }),
    ).toMatchObject({ id: 's2', name: 'Paul' })
    expect(
      resolveRewardBeneficiary({ holderType: 'member', memberId: 'm1', memberFirstName: 'Awa', memberLastName: 'N.' }),
    ).toMatchObject({ id: 'm1', name: 'N. Awa' })
    expect(
      resolveRewardBeneficiary({ holderType: 'non-member', sponsorMemberId: 's1', sponsorName: 'Paul' }),
    ).toMatchObject({ id: 's1', name: 'Paul' })
    expect(resolveRewardBeneficiary({ holderType: 'non-member' })).toBeNull()
  })
})
