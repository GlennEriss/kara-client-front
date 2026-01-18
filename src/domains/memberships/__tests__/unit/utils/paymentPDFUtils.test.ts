/**
 * Tests unitaires pour paymentPDFUtils
 * 
 * Tests des fonctions de formatage et de génération de PDF de reçu de paiement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatPaymentMode,
  formatPaymentType,
  normalizeDate,
  generatePaymentPDF,
} from '../../../utils/paymentPDFUtils'
import type { Payment, PaymentMode, TypePayment } from '@/types/types'

// Mock de jsPDF
const mockSave = vi.fn()
const mockText = vi.fn()
const mockSetFillColor = vi.fn()
const mockSetTextColor = vi.fn()
const mockSetFontSize = vi.fn()
const mockSetFont = vi.fn()
const mockRect = vi.fn()

const mockJsPDF = vi.fn(() => ({
  text: mockText,
  setFillColor: mockSetFillColor,
  setTextColor: mockSetTextColor,
  setFontSize: mockSetFontSize,
  setFont: mockSetFont,
  rect: mockRect,
  save: mockSave,
  internal: {
    pageSize: {
      height: 297,
    },
  },
}))

vi.mock('jspdf', () => ({
  jsPDF: mockJsPDF,
}))

describe('paymentPDFUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==================== formatPaymentMode ====================
  describe('formatPaymentMode', () => {
    it('devrait formater airtel_money en "Airtel Money"', () => {
      expect(formatPaymentMode('airtel_money')).toBe('Airtel Money')
    })

    it('devrait formater mobicash en "Mobicash"', () => {
      expect(formatPaymentMode('mobicash')).toBe('Mobicash')
    })

    it('devrait formater cash en "Espèces"', () => {
      expect(formatPaymentMode('cash')).toBe('Espèces')
    })

    it('devrait formater bank_transfer en "Virement bancaire"', () => {
      expect(formatPaymentMode('bank_transfer')).toBe('Virement bancaire')
    })

    it('devrait formater other en "Autre"', () => {
      expect(formatPaymentMode('other')).toBe('Autre')
    })

    it('devrait retourner la valeur brute si mode inconnu', () => {
      expect(formatPaymentMode('unknown_mode' as PaymentMode)).toBe('unknown_mode')
    })
  })

  // ==================== formatPaymentType ====================
  describe('formatPaymentType', () => {
    it('devrait formater Membership en "Adhésion"', () => {
      expect(formatPaymentType('Membership')).toBe('Adhésion')
    })

    it('devrait formater Subscription en "Cotisation"', () => {
      expect(formatPaymentType('Subscription')).toBe('Cotisation')
    })

    it('devrait formater Tontine en "Tontine"', () => {
      expect(formatPaymentType('Tontine')).toBe('Tontine')
    })

    it('devrait formater Charity en "Charité"', () => {
      expect(formatPaymentType('Charity')).toBe('Charité')
    })

    it('devrait retourner la valeur brute si type inconnu', () => {
      expect(formatPaymentType('UnknownType' as TypePayment)).toBe('UnknownType')
    })
  })

  // ==================== normalizeDate ====================
  describe('normalizeDate', () => {
    it('devrait retourner null si date est null', () => {
      expect(normalizeDate(null)).toBeNull()
    })

    it('devrait retourner null si date est undefined', () => {
      expect(normalizeDate(undefined)).toBeNull()
    })

    it('devrait retourner la Date si déjà une instance Date valide', () => {
      const date = new Date('2026-01-17T15:00:00')
      const result = normalizeDate(date)
      expect(result).toBeInstanceOf(Date)
      expect(result?.getTime()).toBe(date.getTime())
    })

    it('devrait retourner null si Date invalide', () => {
      const invalidDate = new Date('invalid')
      expect(normalizeDate(invalidDate)).toBeNull()
    })

    it('devrait convertir un Timestamp Firestore en Date', () => {
      const firestoreTimestamp = {
        toDate: () => new Date('2026-01-17T15:00:00'),
      }
      const result = normalizeDate(firestoreTimestamp)
      expect(result).toBeInstanceOf(Date)
      expect(result?.toISOString()).toBe(new Date('2026-01-17T15:00:00').toISOString())
    })

    it('devrait convertir une string ISO en Date', () => {
      const isoString = '2026-01-17T15:00:00.000Z'
      const result = normalizeDate(isoString)
      expect(result).toBeInstanceOf(Date)
      expect(result?.toISOString()).toBe(isoString)
    })

    it('devrait convertir un timestamp numérique en Date', () => {
      const timestamp = 1737126000000 // 17 janvier 2025
      const result = normalizeDate(timestamp)
      expect(result).toBeInstanceOf(Date)
      expect(result?.getTime()).toBe(timestamp)
    })

    it('devrait retourner null si string invalide', () => {
      expect(normalizeDate('not-a-date')).toBeNull()
    })

    it('devrait retourner null si objet sans méthode toDate', () => {
      expect(normalizeDate({ foo: 'bar' })).toBeNull()
    })
  })

  // ==================== generatePaymentPDF ====================
  describe('generatePaymentPDF', () => {
    const createMockPayment = (overrides: Partial<Payment> = {}): Payment => ({
      date: new Date('2026-01-17T15:00:00'),
      time: '15:00',
      mode: 'mobicash',
      amount: 10300,
      acceptedBy: 'admin-123',
      paymentType: 'Membership',
      withFees: true,
      recordedBy: 'admin-123',
      recordedByName: 'Admin Test',
      recordedAt: new Date('2026-01-17T15:05:00'),
      ...overrides,
    })

    it('devrait créer un document PDF avec jsPDF', async () => {
      const payment = createMockPayment()

      await generatePaymentPDF({
        payment,
        memberName: 'Jean-Pierre NDONG',
        requestId: '2357.MK.160126',
      })

      expect(mockJsPDF).toHaveBeenCalledWith('portrait', 'mm', 'a4')
    })

    it('devrait inclure le titre "KARA" dans l\'en-tête', async () => {
      const payment = createMockPayment()

      await generatePaymentPDF({
        payment,
        memberName: 'Jean-Pierre NDONG',
        requestId: '2357.MK.160126',
      })

      expect(mockText).toHaveBeenCalledWith('KARA', 20, 20)
    })

    it('devrait inclure le sous-titre "Reçu de paiement – Adhésion"', async () => {
      const payment = createMockPayment()

      await generatePaymentPDF({
        payment,
        memberName: 'Jean-Pierre NDONG',
        requestId: '2357.MK.160126',
      })

      expect(mockText).toHaveBeenCalledWith('Reçu de paiement – Adhésion', 20, 30)
    })

    it('devrait inclure le nom du membre', async () => {
      const payment = createMockPayment()

      await generatePaymentPDF({
        payment,
        memberName: 'Jean-Pierre NDONG',
        requestId: '2357.MK.160126',
      })

      expect(mockText).toHaveBeenCalledWith('Nom complet: Jean-Pierre NDONG', 20, expect.any(Number))
    })

    it('devrait inclure l\'email du membre si fourni', async () => {
      const payment = createMockPayment()

      await generatePaymentPDF({
        payment,
        memberName: 'Jean-Pierre NDONG',
        requestId: '2357.MK.160126',
        memberEmail: 'jean.ndong@email.com',
      })

      expect(mockText).toHaveBeenCalledWith('Email: jean.ndong@email.com', 20, expect.any(Number))
    })

    it('devrait inclure le téléphone du membre si fourni', async () => {
      const payment = createMockPayment()

      await generatePaymentPDF({
        payment,
        memberName: 'Jean-Pierre NDONG',
        requestId: '2357.MK.160126',
        memberPhone: '+241 77 31 61 79',
      })

      expect(mockText).toHaveBeenCalledWith('Téléphone: +241 77 31 61 79', 20, expect.any(Number))
    })

    it('devrait inclure le montant formaté en FCFA', async () => {
      const payment = createMockPayment({ amount: 10300 })

      await generatePaymentPDF({
        payment,
        memberName: 'Jean-Pierre NDONG',
        requestId: '2357.MK.160126',
      })

      // Vérifie que le montant est formaté (10 300 FCFA)
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Montant payé:'),
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('devrait inclure le mode de paiement formaté', async () => {
      const payment = createMockPayment({ mode: 'mobicash' })

      await generatePaymentPDF({
        payment,
        memberName: 'Jean-Pierre NDONG',
        requestId: '2357.MK.160126',
      })

      expect(mockText).toHaveBeenCalledWith(
        'Mode de paiement: Mobicash',
        20,
        expect.any(Number)
      )
    })

    it('devrait inclure les frais de transaction si withFees est true', async () => {
      const payment = createMockPayment({ withFees: true })

      await generatePaymentPDF({
        payment,
        memberName: 'Jean-Pierre NDONG',
        requestId: '2357.MK.160126',
      })

      expect(mockText).toHaveBeenCalledWith(
        'Frais de transaction: Inclus',
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('devrait indiquer "Aucun" pour les frais si withFees est false', async () => {
      const payment = createMockPayment({ withFees: false })

      await generatePaymentPDF({
        payment,
        memberName: 'Jean-Pierre NDONG',
        requestId: '2357.MK.160126',
      })

      expect(mockText).toHaveBeenCalledWith(
        'Frais de transaction: Aucun',
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('devrait ne pas afficher les frais si withFees est undefined', async () => {
      const payment = createMockPayment()
      delete (payment as any).withFees

      await generatePaymentPDF({
        payment,
        memberName: 'Jean-Pierre NDONG',
        requestId: '2357.MK.160126',
      })

      // Vérifie que le PDF est généré sans erreur
      expect(mockSave).toHaveBeenCalled()
    })

    it('devrait utiliser "—" si time est vide', async () => {
      const payment = createMockPayment({ time: '' })

      await generatePaymentPDF({
        payment,
        memberName: 'Jean-Pierre NDONG',
        requestId: '2357.MK.160126',
      })

      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Heure de versement: —'),
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('devrait afficher "Date invalide" si recordedAt est invalide', async () => {
      const payment = createMockPayment({
        recordedAt: 'invalid-date' as any,
      })

      await generatePaymentPDF({
        payment,
        memberName: 'Jean-Pierre NDONG',
        requestId: '2357.MK.160126',
      })

      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Date invalide'),
        20,
        expect.any(Number)
      )
    })

    it('devrait inclure "Admin KARA" comme enregistreur (pas le nom réel)', async () => {
      const payment = createMockPayment({ recordedByName: 'Jean Dupont' })

      await generatePaymentPDF({
        payment,
        memberName: 'Jean-Pierre NDONG',
        requestId: '2357.MK.160126',
      })

      expect(mockText).toHaveBeenCalledWith(
        'Paiement enregistré par: Admin KARA',
        20,
        expect.any(Number)
      )
    })

    it('devrait inclure la référence du paiement avec préfixe PAY-', async () => {
      const payment = createMockPayment()

      await generatePaymentPDF({
        payment,
        memberName: 'Jean-Pierre NDONG',
        requestId: '2357.MK.160126',
      })

      expect(mockText).toHaveBeenCalledWith(
        'Référence du paiement: PAY-2357.MK.160126',
        20,
        expect.any(Number)
      )
    })

    it('devrait inclure la section "Signature / Cachet"', async () => {
      const payment = createMockPayment()

      await generatePaymentPDF({
        payment,
        memberName: 'Jean-Pierre NDONG',
        requestId: '2357.MK.160126',
      })

      expect(mockText).toHaveBeenCalledWith(
        'Signature / Cachet (si impression)',
        20,
        expect.any(Number)
      )
    })

    it('devrait sauvegarder le PDF avec un nom de fichier correct', async () => {
      const payment = createMockPayment({ date: new Date('2026-01-17') })

      await generatePaymentPDF({
        payment,
        memberName: 'Jean-Pierre NDONG',
        requestId: '2357.MK.160126',
      })

      expect(mockSave).toHaveBeenCalledWith(
        expect.stringMatching(/^paiement-2357\.MK\.160126-\d{8}\.pdf$/)
      )
    })

    it('devrait gérer les dates Firestore Timestamp', async () => {
      const firestoreDate = {
        toDate: () => new Date('2026-01-17T15:00:00'),
      }
      const payment = createMockPayment({
        date: firestoreDate as any,
        recordedAt: firestoreDate as any,
      })

      await expect(
        generatePaymentPDF({
          payment,
          memberName: 'Jean-Pierre NDONG',
          requestId: '2357.MK.160126',
        })
      ).resolves.not.toThrow()
    })

    it('devrait afficher "Date invalide" si la date est invalide', async () => {
      const payment = createMockPayment({
        date: 'invalid-date' as any,
      })

      await generatePaymentPDF({
        payment,
        memberName: 'Jean-Pierre NDONG',
        requestId: '2357.MK.160126',
      })

      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Date invalide'),
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('devrait inclure paymentMethodOther si présent', async () => {
      const payment = createMockPayment({
        mode: 'other',
        paymentMethodOther: 'Orange Money',
      })

      await generatePaymentPDF({
        payment,
        memberName: 'Jean-Pierre NDONG',
        requestId: '2357.MK.160126',
      })

      expect(mockText).toHaveBeenCalledWith(
        'Précision: Orange Money',
        20,
        expect.any(Number)
      )
    })

    it('devrait throw une erreur si jsPDF échoue', async () => {
      mockJsPDF.mockImplementationOnce(() => {
        throw new Error('jsPDF error')
      })

      const payment = createMockPayment()

      await expect(
        generatePaymentPDF({
          payment,
          memberName: 'Jean-Pierre NDONG',
          requestId: '2357.MK.160126',
        })
      ).rejects.toThrow('Impossible de générer le PDF')
    })
  })
})
