import { describe, expect, it } from 'vitest'
import { normalizeCompanyForCorrection } from '../../utils/correctionData'

describe('normalizeCompanyForCorrection', () => {
  it("convertit l'adresse à plat de l'espace membre", () => {
    const company = normalizeCompanyForCorrection({
      isEmployed: true,
      companyName: 'SEEG',
      companyProvince: 'Estuaire',
      companyCity: 'Libreville',
      companyDistrict: 'Glass',
      profession: 'Comptable',
      seniority: '3 ans',
    })
    expect(company.isEmployed).toBe(true)
    expect(company.companyAddress).toMatchObject({ province: 'Estuaire', city: 'Libreville', district: 'Glass' })
    expect(company.profession).toBe('Comptable')
  })

  it("garde l'adresse déjà au format du formulaire", () => {
    const company = normalizeCompanyForCorrection({
      isEmployed: true,
      companyAddress: { province: 'Ogooué-Maritime', city: 'Port-Gentil', district: 'Centre', provinceId: 'p1' },
    })
    expect(company.companyAddress).toMatchObject({ province: 'Ogooué-Maritime', city: 'Port-Gentil', provinceId: 'p1' })
  })

  it('accepte une entreprise absente (sans emploi)', () => {
    const company = normalizeCompanyForCorrection(undefined)
    expect(company.isEmployed).toBe(false)
    expect(company.companyAddress).toMatchObject({ province: '', city: '', district: '' })
  })
})
