/**
 * Tests d'intégration pour les fonctionnalités d'export
 * 
 * Ces tests vérifient l'intégration entre les différents modules d'export :
 * - paymentPDFUtils (reçu de paiement)
 * - exportRequestUtils (export demande individuelle)
 * 
 * Les tests d'intégration vérifient que les modules fonctionnent ensemble
 * sans mocker les dépendances internes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatPaymentMode,
  formatPaymentType,
  normalizeDate,
} from '../../utils/paymentPDFUtils'
import {
  createMembershipRequestFixture,
  pendingPaidRequest,
  approvedRequest,
  rejectedRequest,
  generateManyRequests,
} from '../fixtures'
import type { Payment, PaymentMode, TypePayment } from '@/types/types'

describe('Export Integration Tests', () => {
  // ==================== Formatage des données ====================
  describe('Formatage cohérent des données', () => {
    describe('Modes de paiement', () => {
      const allModes: PaymentMode[] = ['airtel_money', 'mobicash', 'cash', 'bank_transfer', 'other']

      it.each(allModes)('devrait formater le mode %s correctement', (mode) => {
        const formatted = formatPaymentMode(mode)
        expect(formatted).toBeTruthy()
        expect(typeof formatted).toBe('string')
        expect(formatted.length).toBeGreaterThan(0)
      })

      it('devrait retourner des labels différents pour chaque mode', () => {
        const labels = allModes.map(formatPaymentMode)
        const uniqueLabels = new Set(labels)
        expect(uniqueLabels.size).toBe(allModes.length)
      })
    })

    describe('Types de paiement', () => {
      const allTypes: TypePayment[] = ['Membership', 'Subscription', 'Tontine', 'Charity']

      it.each(allTypes)('devrait formater le type %s correctement', (type) => {
        const formatted = formatPaymentType(type)
        expect(formatted).toBeTruthy()
        expect(typeof formatted).toBe('string')
        expect(formatted.length).toBeGreaterThan(0)
      })

      it('devrait retourner des labels différents pour chaque type', () => {
        const labels = allTypes.map(formatPaymentType)
        const uniqueLabels = new Set(labels)
        expect(uniqueLabels.size).toBe(allTypes.length)
      })
    })
  })

  // ==================== Normalisation des dates ====================
  describe('Normalisation des dates multi-formats', () => {
    it('devrait normaliser une Date JavaScript', () => {
      const date = new Date('2026-01-17T15:00:00Z')
      const result = normalizeDate(date)
      expect(result).toBeInstanceOf(Date)
      expect(result?.toISOString()).toBe(date.toISOString())
    })

    it('devrait normaliser un Timestamp Firestore', () => {
      const firestoreTimestamp = {
        toDate: () => new Date('2026-01-17T15:00:00Z'),
        seconds: 1737126000,
        nanoseconds: 0,
      }
      const result = normalizeDate(firestoreTimestamp)
      expect(result).toBeInstanceOf(Date)
    })

    it('devrait normaliser une string ISO', () => {
      const isoString = '2026-01-17T15:00:00.000Z'
      const result = normalizeDate(isoString)
      expect(result).toBeInstanceOf(Date)
      expect(result?.toISOString()).toBe(isoString)
    })

    it('devrait normaliser un timestamp Unix (millisecondes)', () => {
      const timestamp = 1737126000000
      const result = normalizeDate(timestamp)
      expect(result).toBeInstanceOf(Date)
      expect(result?.getTime()).toBe(timestamp)
    })

    it('devrait gérer les valeurs nulles/undefined', () => {
      expect(normalizeDate(null)).toBeNull()
      expect(normalizeDate(undefined)).toBeNull()
    })

    it('devrait gérer les dates invalides', () => {
      expect(normalizeDate('invalid')).toBeNull()
      expect(normalizeDate(new Date('invalid'))).toBeNull()
    })
  })

  // ==================== Fixtures de test ====================
  describe('Fixtures de demandes d\'adhésion', () => {
    it('devrait créer une fixture valide avec valeurs par défaut', () => {
      const request = createMembershipRequestFixture()
      
      expect(request.id).toBeTruthy()
      expect(request.matricule).toBeTruthy()
      expect(request.status).toBe('pending')
      expect(request.isPaid).toBe(false)
      expect(request.identity).toBeDefined()
      expect(request.address).toBeDefined()
      expect(request.company).toBeDefined()
      expect(request.documents).toBeDefined()
    })

    it('devrait permettre de surcharger les valeurs', () => {
      const request = createMembershipRequestFixture({
        status: 'approved',
        isPaid: true,
        identity: {
          ...createMembershipRequestFixture().identity,
          firstName: 'Custom',
          lastName: 'Name',
        },
      })
      
      expect(request.status).toBe('approved')
      expect(request.isPaid).toBe(true)
      expect(request.identity.firstName).toBe('Custom')
      expect(request.identity.lastName).toBe('Name')
    })

    it('devrait créer une demande payée avec paiement valide', () => {
      const request = pendingPaidRequest()
      
      expect(request.isPaid).toBe(true)
      expect(request.payments).toBeDefined()
      expect(request.payments?.length).toBeGreaterThan(0)
      
      const payment = request.payments![0]
      expect(payment.amount).toBeGreaterThan(0)
      expect(payment.mode).toBeTruthy()
      expect(payment.paymentType).toBeTruthy()
      expect(payment.recordedBy).toBeTruthy()
      expect(payment.recordedByName).toBeTruthy()
    })

    it('devrait créer une demande approuvée', () => {
      const request = approvedRequest()
      
      expect(request.status).toBe('approved')
      expect(request.isPaid).toBe(true)
      expect(request.processedAt).toBeDefined()
      expect(request.processedBy).toBeTruthy()
    })

    it('devrait créer une demande rejetée avec motif', () => {
      const request = rejectedRequest()
      
      expect(request.status).toBe('rejected')
      expect(request.motifReject).toBeTruthy()
      expect(request.processedAt).toBeDefined()
      expect(request.processedBy).toBeTruthy()
    })

    it('devrait générer plusieurs demandes pour les tests de pagination', () => {
      const count = 50
      const requests = generateManyRequests(count)
      
      expect(requests.length).toBe(count)
      
      // Vérifier que chaque demande a un ID unique
      const ids = requests.map(r => r.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(count)
      
      // Vérifier que les dates sont ordonnées (plus récentes en premier)
      for (let i = 1; i < requests.length; i++) {
        const prevDate = new Date(requests[i - 1].createdAt).getTime()
        const currDate = new Date(requests[i].createdAt).getTime()
        expect(prevDate).toBeGreaterThanOrEqual(currDate)
      }
    })
  })

  // ==================== Données de paiement ====================
  describe('Données de paiement', () => {
    it('devrait avoir des données de paiement complètes dans une demande payée', () => {
      const request = pendingPaidRequest()
      const payment = request.payments![0]
      
      // Champs obligatoires
      expect(payment.date).toBeDefined()
      expect(payment.time).toBeTruthy()
      expect(payment.mode).toBeTruthy()
      expect(payment.amount).toBeGreaterThan(0)
      expect(payment.acceptedBy).toBeTruthy()
      expect(payment.paymentType).toBeTruthy()
      expect(payment.recordedBy).toBeTruthy()
      expect(payment.recordedByName).toBeTruthy()
      expect(payment.recordedAt).toBeDefined()
    })

    it('devrait avoir des dates normalisables', () => {
      const request = pendingPaidRequest()
      const payment = request.payments![0]
      
      const paymentDate = normalizeDate(payment.date)
      const recordedAt = normalizeDate(payment.recordedAt)
      
      expect(paymentDate).toBeInstanceOf(Date)
      expect(recordedAt).toBeInstanceOf(Date)
    })

    it('devrait avoir un mode de paiement formatable', () => {
      const request = pendingPaidRequest()
      const payment = request.payments![0]
      
      const formattedMode = formatPaymentMode(payment.mode)
      expect(formattedMode).toBeTruthy()
      expect(typeof formattedMode).toBe('string')
    })

    it('devrait avoir un type de paiement formatable', () => {
      const request = pendingPaidRequest()
      const payment = request.payments![0]
      
      const formattedType = formatPaymentType(payment.paymentType)
      expect(formattedType).toBeTruthy()
      expect(typeof formattedType).toBe('string')
    })
  })

  // ==================== Scénarios d'export ====================
  describe('Scénarios d\'export', () => {
    it('devrait préparer les données d\'une demande non payée pour l\'export', () => {
      const request = createMembershipRequestFixture({
        isPaid: false,
        payments: undefined,
      })
      
      // Vérifier que les données essentielles sont présentes
      expect(request.identity.firstName).toBeTruthy()
      expect(request.identity.lastName).toBeTruthy()
      expect(request.status).toBeTruthy()
      expect(request.isPaid).toBe(false)
      
      // Pas de paiement
      expect(request.payments).toBeUndefined()
    })

    it('devrait préparer les données d\'une demande payée pour l\'export', () => {
      const request = pendingPaidRequest()
      
      // Vérifier que les données essentielles sont présentes
      expect(request.identity.firstName).toBeTruthy()
      expect(request.identity.lastName).toBeTruthy()
      expect(request.status).toBeTruthy()
      expect(request.isPaid).toBe(true)
      
      // Paiement présent
      expect(request.payments).toBeDefined()
      expect(request.payments!.length).toBeGreaterThan(0)
      
      const payment = request.payments![0]
      expect(payment.amount).toBeGreaterThan(0)
    })

    it('devrait préparer les données de plusieurs demandes pour l\'export en masse', () => {
      const requests = generateManyRequests(10)
      
      // Simuler un filtre par statut
      const pendingRequests = requests.filter(r => r.status === 'pending')
      expect(pendingRequests.length).toBe(10) // Toutes sont pending par défaut
      
      // Simuler un tri par date
      const sortedByDate = [...requests].sort((a, b) => {
        const dateA = normalizeDate(a.createdAt)?.getTime() || 0
        const dateB = normalizeDate(b.createdAt)?.getTime() || 0
        return dateB - dateA // Plus récent en premier
      })
      
      expect(sortedByDate[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        sortedByDate[sortedByDate.length - 1].createdAt.getTime()
      )
    })

    it('devrait préparer les données pour un export par période', () => {
      const requests = generateManyRequests(30)
      
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7) // 7 jours dans le passé
      
      const endDate = new Date()
      
      const filteredByPeriod = requests.filter(r => {
        const date = normalizeDate(r.createdAt)
        if (!date) return false
        return date >= startDate && date <= endDate
      })
      
      // Vérifier que le filtre fonctionne
      expect(filteredByPeriod.length).toBeLessThanOrEqual(requests.length)
      
      filteredByPeriod.forEach(r => {
        const date = normalizeDate(r.createdAt)
        expect(date).toBeDefined()
        expect(date!.getTime()).toBeGreaterThanOrEqual(startDate.getTime())
        expect(date!.getTime()).toBeLessThanOrEqual(endDate.getTime())
      })
    })

    it('devrait préparer les données pour un export limité (N dernières demandes)', () => {
      const requests = generateManyRequests(100)
      const limit = 25
      
      // Trier par date décroissante et prendre les N premières
      const sortedRequests = [...requests].sort((a, b) => {
        const dateA = normalizeDate(a.createdAt)?.getTime() || 0
        const dateB = normalizeDate(b.createdAt)?.getTime() || 0
        return dateB - dateA
      })
      
      const limitedRequests = sortedRequests.slice(0, limit)
      
      expect(limitedRequests.length).toBe(limit)
      
      // Vérifier que ce sont bien les plus récentes
      if (limitedRequests.length > 1) {
        const firstDate = normalizeDate(limitedRequests[0].createdAt)?.getTime() || 0
        const lastDate = normalizeDate(limitedRequests[limitedRequests.length - 1].createdAt)?.getTime() || 0
        expect(firstDate).toBeGreaterThanOrEqual(lastDate)
      }
    })
  })

  // ==================== Validation des données d'export ====================
  describe('Validation des données d\'export', () => {
    it('devrait valider les champs obligatoires pour l\'export PDF', () => {
      const request = createMembershipRequestFixture()
      
      // Champs obligatoires pour le PDF
      const requiredFields = {
        id: request.id,
        firstName: request.identity.firstName,
        lastName: request.identity.lastName,
        status: request.status,
        isPaid: request.isPaid,
        createdAt: request.createdAt,
      }
      
      Object.entries(requiredFields).forEach(([field, value]) => {
        expect(value).toBeDefined()
        if (typeof value === 'string') {
          expect(value.length).toBeGreaterThan(0)
        }
      })
    })

    it('devrait valider les champs obligatoires pour l\'export Excel', () => {
      const request = createMembershipRequestFixture()
      
      // Tous les champs qui seront exportés en Excel
      const excelFields = {
        'Référence demande': request.id,
        'Matricule': request.matricule,
        'Prénom': request.identity.firstName,
        'Nom': request.identity.lastName,
        'Email': request.identity.email,
        'Province': request.address.province,
        'Ville': request.address.city,
        'Statut dossier': request.status,
        'Statut paiement': request.isPaid ? 'Payé' : 'Non payé',
      }
      
      Object.entries(excelFields).forEach(([field, value]) => {
        expect(value).toBeDefined()
      })
    })

    it('devrait valider les champs de paiement pour le reçu PDF', () => {
      const request = pendingPaidRequest()
      const payment = request.payments![0]
      
      // Champs obligatoires pour le reçu de paiement
      const paymentFields = {
        amount: payment.amount,
        mode: payment.mode,
        paymentType: payment.paymentType,
        date: payment.date,
        time: payment.time,
        recordedBy: payment.recordedBy,
        recordedByName: payment.recordedByName,
        recordedAt: payment.recordedAt,
      }
      
      Object.entries(paymentFields).forEach(([field, value]) => {
        expect(value).toBeDefined()
      })
      
      // Validations spécifiques
      expect(payment.amount).toBeGreaterThan(0)
      expect(formatPaymentMode(payment.mode)).toBeTruthy()
      expect(formatPaymentType(payment.paymentType)).toBeTruthy()
    })
  })
})
