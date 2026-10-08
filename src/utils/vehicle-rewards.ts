import type { VehicleInsurance, VehicleInsurancePartner } from '@/types/types'

/** « AXA Gabon », « axa  gabon », « Axa-Gabon » désignent le même assureur. */
export const normalizeInsurerName = (name?: string | null): string =>
  (name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export const findInsurancePartner = (
  partners: VehicleInsurancePartner[],
  insuranceCompany?: string | null,
): VehicleInsurancePartner | undefined => {
  const key = normalizeInsurerName(insuranceCompany)
  return key ? partners.find((partner) => normalizeInsurerName(partner.name) === key) : undefined
}

/**
 * Commission attendue de l'assureur (prime × taux) et part du membre
 * (commission × part). Montants arrondis au franc.
 */
export const computeVehicleReward = (
  premiumAmount: number,
  partner: Pick<VehicleInsurancePartner, 'commissionRate' | 'memberSharePercent'>,
) => {
  const expectedCommission = Math.round((Number(premiumAmount) || 0) * (partner.commissionRate / 100))
  return {
    expectedCommission,
    memberAmount: memberShareOf(expectedCommission, partner.memberSharePercent),
  }
}

export const memberShareOf = (commission: number, memberSharePercent: number): number =>
  Math.round((Number(commission) || 0) * (memberSharePercent / 100))

/**
 * Membre qui reçoit le reversement : celui qui a enregistré le véhicule.
 * Titulaire membre : lui-même ; titulaire non-membre : son parrain.
 */
export const resolveRewardBeneficiary = (
  insurance: Pick<
    VehicleInsurance,
    | 'holderType'
    | 'memberId'
    | 'memberMatricule'
    | 'memberFirstName'
    | 'memberLastName'
    | 'sponsorMemberId'
    | 'sponsorMatricule'
    | 'sponsorName'
  >,
): { id: string; matricule?: string; name: string } | null => {
  if (insurance.holderType === 'member' && insurance.memberId) {
    return {
      id: insurance.memberId,
      matricule: insurance.memberMatricule || undefined,
      name: [insurance.memberFirstName, insurance.memberLastName].filter(Boolean).join(' ').trim() || insurance.memberId,
    }
  }
  if (insurance.sponsorMemberId) {
    return {
      id: insurance.sponsorMemberId,
      matricule: insurance.sponsorMatricule || undefined,
      name: insurance.sponsorName || insurance.sponsorMemberId,
    }
  }
  return null
}
