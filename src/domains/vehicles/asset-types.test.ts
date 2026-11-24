import { describe, expect, it } from 'vitest'
import { assetTypeLabel, insuranceAssetOptions, isAvailableInsuranceAssetType, newInsuranceAssetType, parseInsuranceAssetCatalog } from './asset-types'

describe('Catalogue des biens à assurer', () => {
  it('place les types personnalisés avant Autre et affiche les anciennes références', () => {
    const value = newInsuranceAssetType('  Vitrine   réfrigérée  ', [])
    expect(insuranceAssetOptions(parseInsuranceAssetCatalog({ values: [value] })).slice(-2)).toEqual([
      { value: 'custom:Vitrine réfrigérée', label: 'Vitrine réfrigérée' },
      { value: 'other', label: 'Autre' },
    ])
    expect(assetTypeLabel('other', 'Scène mobile')).toBe('Scène mobile')
    expect(assetTypeLabel('car')).toBe('Voiture')
  })
  it('empêche les doublons indépendamment des accents et de la casse', () => {
    expect(() => newInsuranceAssetType('VITRINE REFRIGEREE', ['custom:Vitrine réfrigérée'])).toThrow(/existe/)
    expect(() => newInsuranceAssetType('autre', [])).toThrow(/existe/)
  })
  it('retire les types des nouveaux dossiers, conserve le type enregistré et protège Autre', () => {
    const custom = 'custom:Vitrine réfrigérée'
    const catalog = parseInsuranceAssetCatalog({ values: [custom], inactive: ['car', custom, 'other', 'unknown'] })
    const available = insuranceAssetOptions(catalog).map((option) => option.value)
    expect(available).not.toContain('car')
    expect(available).not.toContain(custom)
    expect(available.at(-1)).toBe('other')
    expect(insuranceAssetOptions(catalog, { selected: custom })).toContainEqual({ value: custom, label: 'Vitrine réfrigérée' })
    expect(isAvailableInsuranceAssetType('car', catalog)).toBe(false)
    expect(isAvailableInsuranceAssetType('car', catalog, 'car')).toBe(true)
    expect(isAvailableInsuranceAssetType(custom, { ...catalog, inactive: ['car'] })).toBe(true)
  })
})
