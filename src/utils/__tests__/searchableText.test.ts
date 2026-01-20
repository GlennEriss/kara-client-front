import { describe, it, expect } from 'vitest'
import { generateSearchableText, normalizeText } from '../searchableText'
import type { SearchableTextData } from '../searchableText'

describe('searchableText', () => {
  describe('normalizeText', () => {
    it('devrait normaliser un texte en minuscules', () => {
      expect(normalizeText('JEAN')).toBe('jean')
      expect(normalizeText('Dupont')).toBe('dupont')
    })

    it('devrait supprimer les accents', () => {
      expect(normalizeText('Élève')).toBe('eleve')
      expect(normalizeText('François')).toBe('francois')
      expect(normalizeText('José')).toBe('jose')
    })

    it('devrait trimmer les espaces', () => {
      expect(normalizeText('  Jean  ')).toBe('jean')
      expect(normalizeText('  Dupont  ')).toBe('dupont')
    })

    it('devrait gérer les cas null/undefined', () => {
      expect(normalizeText('')).toBe('')
      expect(normalizeText(null as any)).toBe('')
      expect(normalizeText(undefined as any)).toBe('')
    })
  })

  describe('generateSearchableText', () => {
    it('devrait générer searchableText avec tous les champs incluant téléphones', () => {
      const data: SearchableTextData = {
        id: '1234.MK.5678',
        matricule: '1234.MK.5678',
        identity: {
          firstName: 'Jean',
          lastName: 'Dupont',
          email: 'jean@example.com',
          contacts: ['+241 65 67 17 34', '65671734'],
        },
      }

      const result = generateSearchableText(data)

      expect(result).toContain('1234.mk.5678') // ID
      expect(result).toContain('1234.mk.5678') // Matricule
      expect(result).toContain('jean') // Prénom
      expect(result).toContain('dupont') // Nom
      expect(result).toContain('jean dupont') // Nom complet
      expect(result).toContain('jean@example.com') // Email
      expect(result).toContain('+24165671734') // Téléphone normalisé
      expect(result).toContain('65671734') // Téléphone normalisé
    })

    it('devrait gérer les champs manquants', () => {
      const data: SearchableTextData = {
        id: '1234.MK.5678',
        // Pas de matricule
        identity: {
          firstName: 'Jean',
          // Pas de lastName
          // Pas d'email
          // Pas de contacts
        },
      }

      const result = generateSearchableText(data)

      expect(result).toContain('1234.mk.5678') // ID
      expect(result).toContain('jean') // Prénom
      expect(result).not.toContain('dupont') // Pas de nom
      expect(result).not.toContain('jean dupont') // Pas de nom complet
    })

    it('devrait gérer les cas null/undefined', () => {
      const data: SearchableTextData = {
        id: undefined,
        matricule: null as any,
        identity: undefined,
      }

      const result = generateSearchableText(data)

      expect(result).toBe('')
    })

    it('devrait normaliser les téléphones (supprimer espaces, tirets, parenthèses)', () => {
      const data: SearchableTextData = {
        id: 'test-123',
        identity: {
          contacts: [
            '+241 65 67 17 34', // Avec espaces
            '(241) 65-67-17-34', // Avec parenthèses et tirets
            '65671734', // Déjà normalisé
          ],
        },
      }

      const result = generateSearchableText(data)

      expect(result).toContain('+24165671734') // Normalisé
      expect(result).toContain('24165671734') // Normalisé
      expect(result).toContain('65671734') // Déjà normalisé
      expect(result).not.toContain('+241 65 67 17 34') // Non normalisé
      expect(result).not.toContain('(241) 65-67-17-34') // Non normalisé
    })

    it('devrait gérer les tableaux de contacts vides', () => {
      const data: SearchableTextData = {
        id: 'test-123',
        identity: {
          firstName: 'Jean',
          contacts: [],
        },
      }

      const result = generateSearchableText(data)

      expect(result).toContain('test-123')
      expect(result).toContain('jean')
      // Pas de téléphone dans le résultat
    })

    it('devrait gérer les contacts null/undefined dans le tableau', () => {
      const data: SearchableTextData = {
        id: 'test-123',
        identity: {
          firstName: 'Jean',
          contacts: [null as any, undefined as any, '+24165671734'],
        },
      }

      const result = generateSearchableText(data)

      expect(result).toContain('test-123')
      expect(result).toContain('jean')
      expect(result).toContain('+24165671734')
      // Les null/undefined sont ignorés
    })

    it('devrait normaliser les noms avec accents', () => {
      const data: SearchableTextData = {
        id: 'test-123',
        identity: {
          firstName: 'José',
          lastName: 'François',
        },
      }

      const result = generateSearchableText(data)

      expect(result).toContain('jose') // Sans accent
      expect(result).toContain('francois') // Sans accent
      expect(result).toContain('jose francois') // Nom complet sans accents
    })
  })
})
