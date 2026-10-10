import { EMPTY, field, formatDate, toDate, type FieldRow } from './MutuelleDocumentKit'

/**
 * Bloc « Identification du membre » des PDF (contrats, procès-verbaux,
 * demandes de remboursement) : mêmes rubriques, même ordre et même mise en
 * forme que la section 1 de la fiche d'adhésion (« Engagement d'adhésion et de
 * prévoyance sociale »), qui utilise les mêmes fonctions. Un seul endroit à
 * changer si la fiche évolue.
 */

type AddressLike =
  | string
  | { district?: string; arrondissement?: string; city?: string; province?: string }
  | null
  | undefined

export interface MemberIdentitySource {
  lastName?: string | null
  firstName?: string | null
  birthDate?: unknown
  birthPlace?: string | null
  identityDocumentNumber?: string | null
  /** Date de délivrance de la pièce, tirée du dossier d'adhésion. */
  identityDocumentIssuingDate?: unknown
  address?: AddressLike
  contacts?: (string | null | undefined)[] | null
  whatsappNumber?: string | null
  email?: string | null
  profession?: string | null
  companyName?: string | null
}

/** « NOM Prénom », comme sur la fiche d'adhésion. */
export const formatMemberFullName = (lastName?: string | null, firstName?: string | null): string =>
  [lastName?.toUpperCase(), firstName].filter(Boolean).join(' ').trim()

/** Quartier, arrondissement, ville, province. */
export const formatMemberAddress = (address: AddressLike): string => {
  if (!address) return ''
  if (typeof address === 'string') return address.trim()
  return [address.district, address.arrondissement, address.city, address.province].filter(Boolean).join(', ')
}

/** Téléphones puis WhatsApp s'il est différent, séparés par « / ». */
export const formatMemberPhones = (contacts?: (string | null | undefined)[] | null, whatsapp?: string | null): string => {
  const phones = (contacts ?? []).filter((phone): phone is string => !!phone && !!phone.trim())
  if (whatsapp && !phones.includes(whatsapp)) phones.push(whatsapp)
  return phones.join(' / ')
}

/** Profession / Employeur. */
export const formatMemberProfession = (profession?: string | null, companyName?: string | null): string =>
  [profession, companyName].filter(Boolean).join(' / ')

const optionalDate = (value: unknown) => (toDate(value) ? formatDate(value) : '')

/** « 12/03/1990 à LIBREVILLE » ; la partie manquante en pointillés, comme sur la fiche. */
export const formatMemberBirth = (birthDate: unknown, birthPlace?: string | null): string => {
  const date = optionalDate(birthDate)
  const place = birthPlace?.trim().toUpperCase() ?? ''
  if (!date && !place) return ''
  return `${date || EMPTY} à ${place || EMPTY}`
}

/** Les quatre lignes de la section 1 de la fiche d'adhésion. */
export const buildMemberIdentificationRows = (source: MemberIdentitySource): FieldRow[] => [
  [
    field('member.fullName', 'Nom(s) et Prénom(s) :', formatMemberFullName(source.lastName, source.firstName)),
    field('member.birth', 'Date et Lieu de Naissance :', formatMemberBirth(source.birthDate, source.birthPlace)),
  ],
  [
    field('member.identityDocumentNumber', 'N° CNI/Passeport :', source.identityDocumentNumber),
    field('member.identityDocumentIssuingDate', 'Délivré(e) le :', optionalDate(source.identityDocumentIssuingDate), 'date'),
  ],
  [
    field('member.address', 'Adresse / Quartier :', formatMemberAddress(source.address)),
    field('member.phones', 'Téléphone / WhatsApp :', formatMemberPhones(source.contacts, source.whatsappNumber)),
  ],
  [
    field('member.email', 'Email :', source.email),
    field('member.profession', 'Profession / Employeur :', formatMemberProfession(source.profession, source.companyName)),
  ],
]

/** Ligne commune aux documents d'un contrat, après l'identification. */
export const buildMemberContractRow = (matricule: unknown, contractId: unknown): FieldRow => [
  field('member.matricule', 'Matricule / N° d’adhérent :', matricule),
  field('contract.id', 'Référence du contrat :', contractId),
]
