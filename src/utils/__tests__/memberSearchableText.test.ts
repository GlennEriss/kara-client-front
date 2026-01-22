/**
 * Tests unitaires pour memberSearchableText
 */

import { describe, it, expect } from 'vitest'
import {
  generateMemberSearchableText,
  normalizeText,
  extractMemberSearchableData,
} from '../memberSearchableText'
import type { MemberSearchableTextData } from '../memberSearchableText'

describe('memberSearchableText', () => {
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

  describe('generateMemberSearchableText', () => {
    it('devrait générer searchableText avec tous les champs', () => {
      const data: MemberSearchableTextData = {
        matricule: '0004.MK.040825',
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@kara.ga',
        contacts: ['+241 65 67 17 34', '065671734'],
        companyName: 'KARA Gabon',
        profession: 'Ingénieur',
        province: 'Estuaire',
        city: 'Libreville',
        arrondissement: 'Libreville 1er',
        district: 'Quartier A',
      }

      const result = generateMemberSearchableText(data)

      expect(result).toContain('0004.mk.040825') // Matricule
      expect(result).toContain('jean') // Prénom
      expect(result).toContain('dupont') // Nom
      expect(result).toContain('jean dupont') // Nom complet
      expect(result).toContain('jean.dupont@kara.ga') // Email
      expect(result).toContain('+24165671734') // Téléphone normalisé
      expect(result).toContain('065671734') // Téléphone normalisé
      expect(result).toContain('kara gabon') // Entreprise
      expect(result).toContain('ingenieur') // Profession
      expect(result).toContain('estuaire') // Province
      expect(result).toContain('libreville') // Ville
      expect(result).toContain('libreville 1er') // Arrondissement
      expect(result).toContain('quartier a') // Quartier
    })

    it('devrait gérer les champs manquants', () => {
      const data: MemberSearchableTextData = {
        firstName: 'Jean',
        // Pas de lastName, email, contacts, etc.
      }

      const result = generateMemberSearchableText(data)

      expect(result).toContain('jean') // Prénom
      expect(result).not.toContain('dupont') // Pas de nom
      expect(result).not.toContain('jean dupont') // Pas de nom complet
    })

    it('devrait gérer les cas null/undefined', () => {
      const data: MemberSearchableTextData = {
        matricule: null as any,
        firstName: undefined,
        lastName: null as any,
      }

      const result = generateMemberSearchableText(data)

      expect(result).toBe('')
    })

    it('devrait normaliser les téléphones (supprimer espaces, tirets, parenthèses)', () => {
      const data: MemberSearchableTextData = {
        matricule: 'test-123',
        contacts: [
          '+241 65 67 17 34', // Avec espaces
          '(241) 65-67-17-34', // Avec parenthèses et tirets
          '65671734', // Déjà normalisé
        ],
      }

      const result = generateMemberSearchableText(data)

      expect(result).toContain('+24165671734') // Normalisé
      expect(result).toContain('24165671734') // Normalisé
      expect(result).toContain('65671734') // Déjà normalisé
      expect(result).not.toContain('+241 65 67 17 34') // Non normalisé
      expect(result).not.toContain('(241) 65-67-17-34') // Non normalisé
    })

    it('devrait gérer les tableaux de contacts vides', () => {
      const data: MemberSearchableTextData = {
        matricule: 'test-123',
        firstName: 'Jean',
        contacts: [],
      }

      const result = generateMemberSearchableText(data)

      expect(result).toContain('test-123')
      expect(result).toContain('jean')
      // Pas de téléphone dans le résultat
    })

    it('devrait gérer les contacts null/undefined dans le tableau', () => {
      const data: MemberSearchableTextData = {
        matricule: 'test-123',
        firstName: 'Jean',
        contacts: [null as any, undefined as any, '+24165671734'],
      }

      const result = generateMemberSearchableText(data)

      expect(result).toContain('test-123')
      expect(result).toContain('jean')
      expect(result).toContain('+24165671734')
      // Les null/undefined sont ignorés
    })

    it('devrait normaliser les noms avec accents', () => {
      const data: MemberSearchableTextData = {
        matricule: 'test-123',
        firstName: 'José',
        lastName: 'François',
      }

      const result = generateMemberSearchableText(data)

      expect(result).toContain('jose') // Sans accent
      expect(result).toContain('francois') // Sans accent
      expect(result).toContain('jose francois') // Nom complet sans accents
    })

    it('devrait inclure l\'adresse complète', () => {
      const data: MemberSearchableTextData = {
        matricule: 'test-123',
        province: 'Estuaire',
        city: 'Libreville',
        arrondissement: 'Libreville 1er',
        district: 'Quartier A',
      }

      const result = generateMemberSearchableText(data)

      expect(result).toContain('estuaire')
      expect(result).toContain('libreville')
      expect(result).toContain('libreville 1er')
      expect(result).toContain('quartier a')
    })
  })

  describe('extractMemberSearchableData', () => {
    it('devrait extraire les données depuis un document Firestore', () => {
      const firestoreData = {
        matricule: '0004.MK.040825',
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean@example.com',
        contacts: ['+24165671734'],
        companyName: 'KARA Gabon',
        profession: 'Ingénieur',
        address: {
          province: 'Estuaire',
          city: 'Libreville',
          arrondissement: 'Libreville 1er',
          district: 'Quartier A',
        },
      }

      const result = extractMemberSearchableData(firestoreData)

      expect(result).toEqual({
        matricule: '0004.MK.040825',
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean@example.com',
        contacts: ['+24165671734'],
        companyName: 'KARA Gabon',
        profession: 'Ingénieur',
        province: 'Estuaire',
        city: 'Libreville',
        arrondissement: 'Libreville 1er',
        district: 'Quartier A',
      })
    })

    it('devrait gérer les champs manquants', () => {
      const firestoreData = {
        firstName: 'Jean',
        // Pas d'adresse, pas d'entreprise, etc.
      }

      const result = extractMemberSearchableData(firestoreData)

      expect(result).toEqual({
        matricule: undefined,
        firstName: 'Jean',
        lastName: undefined,
        email: undefined,
        contacts: undefined,
        companyName: undefined,
        profession: undefined,
        province: undefined,
        city: undefined,
        arrondissement: undefined,
        district: undefined,
      })
    })

    it('devrait gérer les adresses vides', () => {
      const firestoreData = {
        firstName: 'Jean',
        address: {},
      }

      const result = extractMemberSearchableData(firestoreData)

      expect(result.province).toBeUndefined()
      expect(result.city).toBeUndefined()
      expect(result.arrondissement).toBeUndefined()
      expect(result.district).toBeUndefined()
    })

    it('devrait gérer les données null/undefined', () => {
      const firestoreData = {
        matricule: null,
        firstName: undefined,
        address: null,
      }

      const result = extractMemberSearchableData(firestoreData)

      expect(result.matricule).toBeNull()
      expect(result.firstName).toBeUndefined()
      expect(result.province).toBeUndefined()
    })
  })
})
