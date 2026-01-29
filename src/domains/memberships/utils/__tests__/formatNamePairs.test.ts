import { describe, it, expect } from 'vitest'
import { formatNamePairs } from '../formatNamePairs'

describe('formatNamePairs', () => {
  it('devrait retourner un tableau vide pour une chaîne vide', () => {
    expect(formatNamePairs('')).toEqual([])
    expect(formatNamePairs('   ')).toEqual([])
  })

  it('devrait retourner le nom tel quel s\'il a 1 ou 2 mots', () => {
    expect(formatNamePairs('JEAN')).toEqual(['JEAN'])
    expect(formatNamePairs('ELSIE NADINE')).toEqual(['ELSIE NADINE'])
  })

  it('devrait diviser en paires de 2 mots pour les noms de 3+ mots', () => {
    expect(formatNamePairs('MBOUMBOU MAKAYA EP MOULENGUI')).toEqual([
      'MBOUMBOU MAKAYA',
      'EP MOULENGUI',
    ])
  })

  it('devrait gérer les noms avec 3 mots (1 paire + 1 mot)', () => {
    expect(formatNamePairs('JEAN PIERRE DUPONT')).toEqual([
      'JEAN PIERRE',
      'DUPONT',
    ])
  })

  it('devrait gérer les noms avec 5 mots', () => {
    expect(formatNamePairs('A B C D E')).toEqual([
      'A B',
      'C D',
      'E',
    ])
  })

  it('devrait gérer les espaces multiples', () => {
    expect(formatNamePairs('MBOUMBOU  MAKAYA   EP  MOULENGUI')).toEqual([
      'MBOUMBOU MAKAYA',
      'EP MOULENGUI',
    ])
  })

  it('devrait gérer les chaînes null/undefined', () => {
    expect(formatNamePairs(null as any)).toEqual([])
    expect(formatNamePairs(undefined as any)).toEqual([])
  })
})
