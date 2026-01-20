/**
 * Tests unitaires pour correctionUtils
 * 
 * Approche TDD : Tests écrits selon la documentation
 */

import { describe, it, expect, vi } from 'vitest'
import {
  formatSecurityCode,
  getTimeRemaining,
  generateCorrectionLink,
  generateWhatsAppMessage,
  type GenerateWhatsAppMessageParams,
} from '../../../utils/correctionUtils'

describe('Correction Utils', () => {
  describe('formatSecurityCode', () => {
    it('devrait formater un code de 6 chiffres avec des tirets (12-34-56)', () => {
      expect(formatSecurityCode('123456')).toBe('12-34-56')
    })

    it('devrait retourner le code tel quel si pas 6 chiffres', () => {
      expect(formatSecurityCode('12345')).toBe('12345')
      expect(formatSecurityCode('1234567')).toBe('1234567')
    })

    it('devrait gérer une chaîne vide', () => {
      expect(formatSecurityCode('')).toBe('')
    })

    it('devrait gérer un code null ou undefined', () => {
      expect(formatSecurityCode(null as any)).toBe('')
      expect(formatSecurityCode(undefined as any)).toBe('')
    })

    it('devrait formater correctement différents codes', () => {
      expect(formatSecurityCode('000000')).toBe('00-00-00')
      expect(formatSecurityCode('999999')).toBe('99-99-99')
      expect(formatSecurityCode('123456')).toBe('12-34-56')
    })
  })

  describe('getTimeRemaining', () => {
    it('devrait calculer le temps restant correctement (2j 13h)', () => {
      const expiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000) // +2j 13h
      const remaining = getTimeRemaining(expiry)
      expect(remaining).toBe('2j 13h')
    })

    it('devrait gérer une date expirée (retourner 0j 0h)', () => {
      const expiry = new Date(Date.now() - 1000)
      const remaining = getTimeRemaining(expiry)
      expect(remaining).toBe('0j 0h')
    })

    it('devrait gérer une date avec seulement des heures (0j 5h)', () => {
      const expiry = new Date(Date.now() + 5 * 60 * 60 * 1000) // +5h
      const remaining = getTimeRemaining(expiry)
      expect(remaining).toBe('0j 5h')
    })

    it('devrait gérer null ou undefined (retourner 0j 0h)', () => {
      expect(getTimeRemaining(null)).toBe('0j 0h')
      expect(getTimeRemaining(undefined)).toBe('0j 0h')
    })

    it('devrait gérer une date expirant dans moins d\'une heure', () => {
      const expiry = new Date(Date.now() + 30 * 60 * 1000) // +30 minutes
      const remaining = getTimeRemaining(expiry)
      expect(remaining).toBe('0j 0h')
    })

    it('devrait gérer une date expirant dans exactement 1 jour', () => {
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // +24h
      const remaining = getTimeRemaining(expiry)
      expect(remaining).toBe('1j 0h')
    })
  })

  describe('generateCorrectionLink', () => {
    it('devrait générer un lien sans paramètre code', () => {
      const link = generateCorrectionLink('test-request-id')
      expect(link).toBe('/register?requestId=test-request-id')
      expect(link).not.toContain('code=')
    })

    it('devrait générer un lien valide pour différents requestId', () => {
      expect(generateCorrectionLink('abc123')).toBe('/register?requestId=abc123')
      expect(generateCorrectionLink('req-001')).toBe('/register?requestId=req-001')
    })

    it('devrait throw si requestId est vide', () => {
      expect(() => generateCorrectionLink('')).toThrow()
    })

    it('devrait throw si requestId est null ou undefined', () => {
      expect(() => generateCorrectionLink(null as any)).toThrow()
      expect(() => generateCorrectionLink(undefined as any)).toThrow()
    })
  })

  describe('generateWhatsAppMessage', () => {
    const baseParams: GenerateWhatsAppMessageParams = {
      requestId: 'test-request-id',
      firstName: 'Jean',
      corrections: ['Photo floue', 'Date de naissance incorrecte'],
      securityCode: '123456',
      expiryDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // +48h
    }

    it('devrait générer un message WhatsApp complet', () => {
      const message = generateWhatsAppMessage(baseParams)
      
      expect(message).toContain('Bonjour Jean')
      expect(message).toContain('Photo floue')
      expect(message).toContain('Date de naissance incorrecte')
      expect(message).toContain('12-34-56') // Code formaté
      expect(message).toContain('/register?requestId=test-request-id')
      expect(message).toContain('KARA Mutuelle')
    })

    it('devrait inclure le code formaté dans le message', () => {
      const message = generateWhatsAppMessage({
        ...baseParams,
        securityCode: '654321',
      })
      
      expect(message).toContain('65-43-21')
    })

    it('devrait inclure la date d\'expiration formatée', () => {
      const expiryDate = new Date('2024-12-31T23:59:59')
      const message = generateWhatsAppMessage({
        ...baseParams,
        expiryDate,
      })
      
      expect(message).toContain('31/12/2024')
    })

    it('devrait inclure le temps restant dans le message', () => {
      // Utiliser un timer factice pour contrôler le temps
      const now = new Date('2024-01-20T09:00:00Z')
      vi.useFakeTimers()
      vi.setSystemTime(now)
      
      // Créer une date d'expiration exactement 2 jours et 13 heures plus tard
      const expiryDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000) // +2j 13h
      
      const message = generateWhatsAppMessage({
        ...baseParams,
        expiryDate,
      })
      
      expect(message).toContain('dans 2j 13h')
      
      // Restaurer le timer réel
      vi.useRealTimers()
    })

    it('devrait utiliser baseUrl si fourni pour générer le lien complet', () => {
      const message = generateWhatsAppMessage({
        ...baseParams,
        baseUrl: 'https://example.com',
      })
      
      expect(message).toContain('https://example.com/register?requestId=test-request-id')
    })

    it('devrait formater les corrections avec des tirets', () => {
      const message = generateWhatsAppMessage({
        ...baseParams,
        corrections: ['Correction 1', 'Correction 2', 'Correction 3'],
      })
      
      expect(message).toContain('- Correction 1')
      expect(message).toContain('- Correction 2')
      expect(message).toContain('- Correction 3')
    })

    it('devrait filtrer les corrections vides', () => {
      const message = generateWhatsAppMessage({
        ...baseParams,
        corrections: ['Correction 1', '', '   ', 'Correction 2'],
      })
      
      expect(message).toContain('- Correction 1')
      expect(message).toContain('- Correction 2')
      expect(message).not.toContain('Correction 3')
    })

    it('devrait throw si requestId manquant', () => {
      expect(() => generateWhatsAppMessage({
        ...baseParams,
        requestId: '',
      })).toThrow()
    })

    it('devrait throw si firstName manquant', () => {
      expect(() => generateWhatsAppMessage({
        ...baseParams,
        firstName: '',
      })).toThrow()
    })

    it('devrait throw si corrections vide', () => {
      expect(() => generateWhatsAppMessage({
        ...baseParams,
        corrections: [],
      })).toThrow()
    })

    it('devrait throw si securityCode manquant', () => {
      expect(() => generateWhatsAppMessage({
        ...baseParams,
        securityCode: '',
      })).toThrow()
    })

    it('devrait throw si expiryDate manquant', () => {
      expect(() => generateWhatsAppMessage({
        ...baseParams,
        expiryDate: null as any,
      })).toThrow()
    })
  })
})
