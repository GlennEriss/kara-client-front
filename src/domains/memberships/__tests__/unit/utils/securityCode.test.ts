/**
 * Tests unitaires pour securityCode utils
 * 
 * Approche TDD : Tests écrits AVANT l'implémentation
 */

import { describe, it, expect } from 'vitest'
import {
  generateSecurityCode,
  isSecurityCodeValid,
  calculateCodeExpiry,
} from '../../../utils/securityCode'

describe('SecurityCode Utils', () => {
  describe('generateSecurityCode', () => {
    it('devrait générer un code de 6 chiffres', () => {
      const code = generateSecurityCode()
      expect(code).toMatch(/^\d{6}$/)
    })

    it('devrait générer des codes uniques (pas de doublons sur 1000 appels)', () => {
      const codes = new Set(Array(1000).fill(0).map(() => generateSecurityCode()))
      // Autoriser < 1% de doublons (statistiquement possible)
      expect(codes.size).toBeGreaterThan(990)
    })

    it('devrait éviter les codes faciles (000000, 111111, 123456)', () => {
      const easyPatterns = ['000000', '111111', '123456', '654321', '012345']
      const codes = Array(100).fill(0).map(() => generateSecurityCode())
      codes.forEach(code => {
        expect(easyPatterns).not.toContain(code)
      })
    })

    it('devrait générer un code dans la plage 100000-999999', () => {
      const code = generateSecurityCode()
      const codeNumber = parseInt(code, 10)
      expect(codeNumber).toBeGreaterThanOrEqual(100000)
      expect(codeNumber).toBeLessThanOrEqual(999999)
    })
  })

  describe('isSecurityCodeValid', () => {
    it('devrait retourner true si code non utilisé et non expiré', () => {
      const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h dans le futur
      const result = isSecurityCodeValid({
        code: '123456',
        used: false,
        expiry: expiryDate,
      })
      expect(result).toBe(true)
    })

    it('devrait retourner false si code utilisé', () => {
      const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const result = isSecurityCodeValid({
        code: '123456',
        used: true,
        expiry: expiryDate,
      })
      expect(result).toBe(false)
    })

    it('devrait retourner false si code expiré', () => {
      const expiryDate = new Date(Date.now() - 60 * 60 * 1000) // 1h dans le passé
      const result = isSecurityCodeValid({
        code: '123456',
        used: false,
        expiry: expiryDate,
      })
      expect(result).toBe(false)
    })

    it('devrait retourner false si code null', () => {
      const result = isSecurityCodeValid({
        code: null,
        used: false,
        expiry: new Date(),
      })
      expect(result).toBe(false)
    })

    it('devrait retourner false si code undefined', () => {
      const result = isSecurityCodeValid({
        code: undefined,
        used: false,
        expiry: new Date(),
      })
      expect(result).toBe(false)
    })

    it('devrait retourner false si expiry est null', () => {
      const result = isSecurityCodeValid({
        code: '123456',
        used: false,
        expiry: null,
      })
      expect(result).toBe(false)
    })
  })

  describe('calculateCodeExpiry', () => {
    it('devrait retourner une date 48h dans le futur par défaut', () => {
      const now = new Date()
      const expiry = calculateCodeExpiry()
      
      const diffMs = expiry.getTime() - now.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)
      
      expect(diffHours).toBeCloseTo(48, 0) // ±1 heure de tolérance
    })

    it('devrait accepter un paramètre de durée personnalisé', () => {
      const now = new Date()
      const customHours = 24
      const expiry = calculateCodeExpiry(customHours)
      
      const diffMs = expiry.getTime() - now.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)
      
      expect(diffHours).toBeCloseTo(customHours, 0)
    })

    it('devrait retourner une date future', () => {
      const expiry = calculateCodeExpiry()
      const now = new Date()
      expect(expiry.getTime()).toBeGreaterThan(now.getTime())
    })
  })
})
