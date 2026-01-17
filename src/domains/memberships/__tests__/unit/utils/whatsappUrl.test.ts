/**
 * Tests unitaires pour whatsappUrl utils
 * 
 * Approche TDD : Tests écrits AVANT l'implémentation
 */

import { describe, it, expect } from 'vitest'
import {
  normalizePhoneNumber,
  generateWhatsAppUrl,
} from '../../../utils/whatsappUrl'

describe('WhatsApp URL Utils', () => {
  describe('normalizePhoneNumber', () => {
    it('devrait ajouter le préfixe +241 si absent', () => {
      expect(normalizePhoneNumber('65671734')).toBe('+24165671734')
    })

    it('devrait conserver +241 si déjà présent', () => {
      expect(normalizePhoneNumber('+24165671734')).toBe('+24165671734')
    })

    it('devrait supprimer les espaces', () => {
      expect(normalizePhoneNumber('65 67 17 34')).toBe('+24165671734')
    })

    it('devrait supprimer les tirets', () => {
      expect(normalizePhoneNumber('65-67-17-34')).toBe('+24165671734')
    })

    it('devrait gérer le préfixe 00241', () => {
      expect(normalizePhoneNumber('0024165671734')).toBe('+24165671734')
    })

    it('devrait gérer les parenthèses et points', () => {
      expect(normalizePhoneNumber('(+241) 65.67.17.34')).toBe('+24165671734')
    })

    it('devrait throw si numéro invalide (trop court)', () => {
      expect(() => normalizePhoneNumber('12345')).toThrow()
    })

    it('devrait throw si numéro invalide (trop long)', () => {
      expect(() => normalizePhoneNumber('1234567890123456')).toThrow()
    })

    it('devrait throw si numéro invalide (caractères non numériques après nettoyage)', () => {
      expect(() => normalizePhoneNumber('abc12345')).toThrow()
    })

    it('devrait gérer un numéro avec préfixe 0', () => {
      expect(normalizePhoneNumber('065671734')).toBe('+24165671734')
    })
  })

  describe('generateWhatsAppUrl', () => {
    it('devrait générer une URL WhatsApp valide avec numéro normalisé', () => {
      const url = generateWhatsAppUrl('65671734', 'Bonjour')
      expect(url).toContain('https://wa.me/24165671734')
      expect(url).toContain('text=')
    })

    it('devrait encoder le message correctement', () => {
      const message = 'Bonjour, voici votre lien de correction'
      const url = generateWhatsAppUrl('65671734', message)
      expect(url).toContain(encodeURIComponent(message))
    })

    it('devrait gérer les caractères spéciaux dans le message', () => {
      const message = 'Bonjour! Voici votre lien: https://example.com/correction?code=123456'
      const url = generateWhatsAppUrl('65671734', message)
      expect(url).toContain('text=')
      // Vérifier que l'URL est valide
      expect(() => new URL(url)).not.toThrow()
    })

    it('devrait générer une URL sans message si message vide', () => {
      const url = generateWhatsAppUrl('65671734', '')
      expect(url).toBe('https://wa.me/24165671734')
    })

    it('devrait normaliser le numéro de téléphone avant de générer l\'URL', () => {
      const url = generateWhatsAppUrl('65 67 17 34', 'Bonjour')
      expect(url).toContain('24165671734')
    })
  })
})
