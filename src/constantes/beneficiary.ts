import {
  UNKNOWN_USER_FIRST_NAME,
  UNKNOWN_USER_LAST_NAME,
  UNKNOWN_USER_MATRICULE,
} from '@/domains/financial/caisse-imprevue/import/unknownUser'

/**
 * Ayant droit (bénéficiaire désigné en cas de décès du membre).
 *
 * L'ayant droit doit être un membre de LE KARA : on enregistre son matricule.
 * Sans ayant droit, le système enregistre le membre « INCONNU INCONNU »
 * (le même compte technique que pour les parrains et garants manquants).
 */
export type Beneficiary = {
  matricule: string
  lastName: string
  firstName?: string
  /** Vrai quand aucun ayant droit n'a été désigné (membre INCONNU). */
  isUnknown?: boolean
  // Anciennes déclarations : personne saisie à la main, avant cette règle.
  relationship?: string
  phone?: string
  idNumber?: string
}

export const MEMBER_MATRICULE_REGEX = /^\d+\.MK\.\d+$/

export const UNKNOWN_BENEFICIARY: Beneficiary = {
  matricule: UNKNOWN_USER_MATRICULE,
  lastName: UNKNOWN_USER_LAST_NAME,
  firstName: UNKNOWN_USER_FIRST_NAME,
  isUnknown: true,
}

/** Ayant droit à enregistrer : le membre choisi, sinon INCONNU. */
export function resolveBeneficiary(beneficiary: Partial<Beneficiary> | null | undefined): Beneficiary {
  const matricule = beneficiary?.matricule?.trim() ?? ''
  if (!matricule || !MEMBER_MATRICULE_REGEX.test(matricule) || matricule === UNKNOWN_USER_MATRICULE) {
    return { ...UNKNOWN_BENEFICIARY }
  }
  return {
    matricule,
    lastName: beneficiary?.lastName?.trim() ?? '',
    firstName: beneficiary?.firstName?.trim() || undefined,
    isUnknown: false,
  }
}

/** Applique la règle de l'ayant droit à une identité avant enregistrement. */
export function withResolvedBeneficiary<T extends { beneficiary?: Partial<Beneficiary> | null }>(identity: T): T {
  return { ...identity, beneficiary: resolveBeneficiary(identity.beneficiary) }
}

/** Libellé d'affichage : « NOM Prénom (matricule) » ou « INCONNU ». */
export function formatBeneficiary(beneficiary: Partial<Beneficiary> | null | undefined): string {
  if (!beneficiary) return 'INCONNU'
  if (beneficiary.isUnknown || beneficiary.matricule === UNKNOWN_USER_MATRICULE) return 'INCONNU'
  const name = [beneficiary.lastName, beneficiary.firstName].filter(Boolean).join(' ')
  return beneficiary.matricule ? `${name || 'Membre'} (${beneficiary.matricule})` : name || 'INCONNU'
}
