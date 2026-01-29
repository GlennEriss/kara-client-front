/**
 * Tests unitaires pour generateDemandSearchableText
 *
 * @see documentation/caisse-imprevue/V2/recherche-demande/tests/TESTS_UNITAIRES.md
 */

import { describe, it, expect } from 'vitest'
import {
  generateDemandSearchableText,
  generateDemandSearchableTextFirstNameFirst,
  generateDemandSearchableTextMatriculeFirst,
  generateAllDemandSearchableTexts,
} from '../demandSearchableText'

describe('generateDemandSearchableText', () => {
  it('devrait générer searchableText avec nom, prénom et matricule', () => {
    const result = generateDemandSearchableText('Dupont', 'Jean', '8438.MK.160126')
    expect(result).toBe('dupont jean 8438.mk.160126')
  })

  it('devrait normaliser en minuscules', () => {
    const result = generateDemandSearchableText('DUPONT', 'JEAN', '8438')
    expect(result).toBe('dupont jean 8438')
  })

  it('devrait supprimer les accents', () => {
    const result = generateDemandSearchableText('Dupont', 'José', '8438')
    expect(result).toBe('dupont jose 8438')
  })

  it('devrait filtrer les champs vides', () => {
    const result = generateDemandSearchableText('Dupont', '', '8438')
    expect(result).toBe('dupont 8438')
  })

  it('devrait trimmer les espaces', () => {
    const result = generateDemandSearchableText('  Dupont  ', '  Jean  ', '8438')
    expect(result).toBe('dupont jean 8438')
  })

  it('devrait gérer les champs undefined', () => {
    const result = generateDemandSearchableText('Dupont', undefined as any, '8438')
    expect(result).toContain('dupont')
    expect(result).toContain('8438')
  })

  it('devrait retourner une chaîne vide si tous les champs vides', () => {
    const result = generateDemandSearchableText('', '', '')
    expect(result).toBe('')
  })

  it('devrait gérer François avec accent', () => {
    const result = generateDemandSearchableText('François', 'Élise', '1234')
    expect(result).toBe('francois elise 1234')
  })
})

describe('generateDemandSearchableTextFirstNameFirst', () => {
  it('devrait mettre le prénom en premier pour recherche "alain owono"', () => {
    const result = generateDemandSearchableTextFirstNameFirst('NDONG', 'Alain Owono', '8438.MK.160126')
    expect(result).toBe('alain owono ndong 8438.mk.160126')
  })
})

describe('generateDemandSearchableTextMatriculeFirst', () => {
  it('devrait mettre le matricule en premier pour recherche "8438"', () => {
    const result = generateDemandSearchableTextMatriculeFirst('NDONG', 'Alain', '8438.MK.160126')
    expect(result).toBe('8438.mk.160126 alain ndong')
  })
})

describe('generateAllDemandSearchableTexts', () => {
  it('devrait générer les 3 variantes', () => {
    const result = generateAllDemandSearchableTexts('NDONG', 'Alain Owono', '8438.MK.160126')
    expect(result.searchableText).toBe('ndong alain owono 8438.mk.160126')
    expect(result.searchableTextFirstNameFirst).toBe('alain owono ndong 8438.mk.160126')
    expect(result.searchableTextMatriculeFirst).toBe('8438.mk.160126 alain owono ndong')
  })
})
