/**
 * Tests unitaires pour membershipValidation utils
 * 
 * Approche TDD : Tests écrits AVANT l'implémentation
 */

import { describe, it, expect } from 'vitest'
import {
  validateEmail,
  validatePhoneNumber,
  validateName,
  validateAddress,
} from '../../../utils/membershipValidation'

describe('Membership Validation Utils', () => {
  describe('validateEmail', () => {
    it('devrait retourner true pour un email valide', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name@domain.co.uk')).toBe(true)
      expect(validateEmail('test+tag@example.com')).toBe(true)
    })

    it('devrait retourner false pour un email invalide', () => {
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('@example.com')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
      expect(validateEmail('test.example.com')).toBe(false)
      expect(validateEmail('')).toBe(false)
    })

    it('devrait respecter les limites de longueur', () => {
      const shortEmail = 'a@b.c'
      const longEmail = 'a'.repeat(250) + '@example.com'
      
      // Email trop court (5 caractères minimum)
      expect(validateEmail(shortEmail)).toBe(true) // Valide mais peut-être rejeté côté serveur
      
      // Email trop long (> 255 caractères)
      expect(validateEmail(longEmail)).toBe(false)
    })
  })

  describe('validatePhoneNumber', () => {
    it('devrait retourner true pour un numéro valide', () => {
      expect(validatePhoneNumber('65671734')).toBe(true)
      expect(validatePhoneNumber('+24165671734')).toBe(true)
      expect(validatePhoneNumber('0024165671734')).toBe(true)
    })

    it('devrait retourner false pour un numéro trop court', () => {
      expect(validatePhoneNumber('12345')).toBe(false)
      expect(validatePhoneNumber('1234567')).toBe(false) // 7 chiffres < 8 minimum
    })

    it('devrait retourner false pour un numéro trop long', () => {
      const longNumber = '1'.repeat(16) // 16 chiffres > 15 maximum
      expect(validatePhoneNumber(longNumber)).toBe(false)
    })

    it('devrait retourner false pour un numéro vide', () => {
      expect(validatePhoneNumber('')).toBe(false)
    })

    it('devrait accepter les numéros avec espaces/tirets (seront normalisés)', () => {
      expect(validatePhoneNumber('65 67 17 34')).toBe(true)
      expect(validatePhoneNumber('65-67-17-34')).toBe(true)
    })
  })

  describe('validateName', () => {
    it('devrait retourner true pour un nom valide', () => {
      expect(validateName('Dupont')).toBe(true)
      expect(validateName('Jean-Pierre')).toBe(true)
      expect(validateName("O'Brien")).toBe(true)
    })

    it('devrait retourner false pour un nom trop court', () => {
      expect(validateName('A')).toBe(false)
      expect(validateName('')).toBe(false)
    })

    it('devrait retourner false pour un nom trop long', () => {
      const longName = 'A'.repeat(101) // > 100 maximum
      expect(validateName(longName)).toBe(false)
    })

    it('devrait accepter les noms avec accents et caractères spéciaux', () => {
      expect(validateName('Müller')).toBe(true)
      expect(validateName('José')).toBe(true)
      expect(validateName("O'Connor")).toBe(true)
    })

    it('devrait rejeter les noms uniquement numériques', () => {
      expect(validateName('12345')).toBe(false)
    })
  })

  describe('validateAddress', () => {
    it('devrait retourner true pour une adresse valide', () => {
      expect(validateAddress('123 Rue de la République')).toBe(true)
      expect(validateAddress('Avenue Léon Mba, BP 1234')).toBe(true)
    })

    it('devrait retourner false pour une adresse trop courte', () => {
      expect(validateAddress('123')).toBe(false)
      expect(validateAddress('')).toBe(false)
    })

    it('devrait retourner false pour une adresse trop longue', () => {
      const longAddress = 'A'.repeat(501) // > 500 maximum
      expect(validateAddress(longAddress)).toBe(false)
    })

    it('devrait accepter les adresses avec caractères spéciaux', () => {
      expect(validateAddress('123, Rue de la République')).toBe(true)
      expect(validateAddress('BP 1234 - Libreville')).toBe(true)
    })
  })
})
