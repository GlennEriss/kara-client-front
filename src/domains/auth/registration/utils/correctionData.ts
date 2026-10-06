import type { RegisterFormData } from '@/schemas/schemas'

/**
 * Une demande faite depuis l'espace membre (kara-members-front) n'enregistre
 * pas l'entreprise au même format que le formulaire d'inscription : l'adresse
 * y est à plat (`companyProvince`, `companyCity`, `companyDistrict`) au lieu
 * de `companyAddress`. Sans conversion, l'étape 3 de la correction s'ouvre
 * vide et refuse de continuer.
 */
export function normalizeCompanyForCorrection(company: unknown): RegisterFormData['company'] {
  const raw = (company ?? {}) as Record<string, unknown> & {
    companyAddress?: Record<string, unknown>
  }
  const text = (value: unknown) => (typeof value === 'string' ? value : '')
  const address = raw.companyAddress ?? {}

  return {
    ...(raw as RegisterFormData['company']),
    isEmployed: raw.isEmployed === true,
    companyName: text(raw.companyName),
    profession: text(raw.profession),
    seniority: text(raw.seniority),
    companyAddress: {
      ...address,
      province: text(address.province) || text(raw.companyProvince),
      city: text(address.city) || text(raw.companyCity),
      district: text(address.district) || text(raw.companyDistrict),
    },
  } as RegisterFormData['company']
}
