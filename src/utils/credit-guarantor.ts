import { UNKNOWN_USER_ID } from '@/domains/financial/caisse-imprevue/import/unknownUser'

/** Le compte INCONNU représente la garantie de LE KARA, sans commission externe. */
export function isUnknownGuarantor(guarantor: { guarantorId?: string | null }): boolean {
  return !guarantor.guarantorId?.trim() || guarantor.guarantorId.trim() === UNKNOWN_USER_ID
}
