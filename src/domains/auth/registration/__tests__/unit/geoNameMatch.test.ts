import { describe, expect, it } from 'vitest'
import { findByGeoName, normalizeGeoName } from '../../utils/geoNameMatch'

const provinces = [
  { id: 'p1', name: 'Estuaire' },
  { id: 'p2', name: 'Haut-Ogooué' },
  { id: 'p3', name: "Ogooué-Maritime" },
]

describe('geoNameMatch', () => {
  it('ignore la casse, les accents, les tirets et les espaces', () => {
    expect(normalizeGeoName('  Haut-Ogooué ')).toBe('haut ogooue')
    expect(findByGeoName(provinces, 'haut ogooue')?.id).toBe('p2')
    expect(findByGeoName(provinces, 'ESTUAIRE')?.id).toBe('p1')
  })

  it('ne trouve rien pour un nom vide ou inconnu', () => {
    expect(findByGeoName(provinces, '')).toBeUndefined()
    expect(findByGeoName(provinces, undefined)).toBeUndefined()
    expect(findByGeoName(provinces, 'Woleu-Ntem')).toBeUndefined()
  })
})
