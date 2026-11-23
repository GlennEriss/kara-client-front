import { describe, expect, it } from 'vitest'
import { assetTypeLabel, insuranceAssetOptions, newInsuranceAssetType } from './asset-types'

describe('Catalogue des biens à assurer', () => {
  it('place les types personnalisés avant Autre et affiche les anciennes références', () => {
    const value = newInsuranceAssetType('  Vitrine   réfrigérée  ', [])
    expect(insuranceAssetOptions([value]).slice(-2)).toEqual([
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
})
