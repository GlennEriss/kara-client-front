/**
 * Tests unitaires pour getSubscriptionAmountFromPayments
 */

import { describe, it, expect } from 'vitest'
import { getSubscriptionAmountFromPayments } from '../../../utils/getSubscriptionAmountFromPayments'
import type { Payment } from '@/types/types'

describe('getSubscriptionAmountFromPayments', () => {
  describe('Priorité 1: Paiement de type Subscription', () => {
    it('devrait retourner le montant du paiement Subscription', () => {
      const payments: Payment[] = [
        {
          date: new Date(),
          time: '10:00',
          mode: 'cash',
          amount: 15000,
          paymentType: 'Subscription',
          acceptedBy: 'admin-1',
          recordedBy: 'admin-1',
          recordedByName: 'Admin Test',
          recordedAt: new Date(),
        },
        {
          date: new Date(),
          time: '10:00',
          mode: 'cash',
          amount: 20000,
          paymentType: 'Membership',
          acceptedBy: 'admin-1',
          recordedBy: 'admin-1',
          recordedByName: 'Admin Test',
          recordedAt: new Date(),
        },
      ]

      const result = getSubscriptionAmountFromPayments(payments, 'adherant')
      expect(result).toBe(15000)
    })

    it('devrait retourner le montant du paiement Subscription même s\'il y a plusieurs paiements', () => {
      const payments: Payment[] = [
        {
          date: new Date(),
          time: '10:00',
          mode: 'cash',
          amount: 10000,
          paymentType: 'Tontine',
          acceptedBy: 'admin-1',
          recordedBy: 'admin-1',
          recordedByName: 'Admin Test',
          recordedAt: new Date(),
        },
        {
          date: new Date(),
          time: '10:00',
          mode: 'cash',
          amount: 25000,
          paymentType: 'Subscription',
          acceptedBy: 'admin-1',
          recordedBy: 'admin-1',
          recordedByName: 'Admin Test',
          recordedAt: new Date(),
        },
      ]

      const result = getSubscriptionAmountFromPayments(payments, 'adherant')
      expect(result).toBe(25000)
    })
  })

  describe('Priorité 2: Paiement de type Membership', () => {
    it('devrait retourner le montant du paiement Membership si pas de Subscription', () => {
      const payments: Payment[] = [
        {
          date: new Date(),
          time: '10:00',
          mode: 'cash',
          amount: 18000,
          paymentType: 'Membership',
          acceptedBy: 'admin-1',
          recordedBy: 'admin-1',
          recordedByName: 'Admin Test',
          recordedAt: new Date(),
        },
      ]

      const result = getSubscriptionAmountFromPayments(payments, 'adherant')
      expect(result).toBe(18000)
    })

    it('devrait retourner le montant du paiement Membership même s\'il y a d\'autres paiements', () => {
      const payments: Payment[] = [
        {
          date: new Date(),
          time: '10:00',
          mode: 'cash',
          amount: 5000,
          paymentType: 'Tontine',
          acceptedBy: 'admin-1',
          recordedBy: 'admin-1',
          recordedByName: 'Admin Test',
          recordedAt: new Date(),
        },
        {
          date: new Date(),
          time: '10:00',
          mode: 'cash',
          amount: 22000,
          paymentType: 'Membership',
          acceptedBy: 'admin-1',
          recordedBy: 'admin-1',
          recordedByName: 'Admin Test',
          recordedAt: new Date(),
        },
      ]

      const result = getSubscriptionAmountFromPayments(payments, 'adherant')
      expect(result).toBe(22000)
    })
  })

  describe('Priorité 3: Premier paiement disponible', () => {
    it('devrait retourner le montant du premier paiement si aucun Subscription/Membership', () => {
      const payments: Payment[] = [
        {
          date: new Date(),
          time: '10:00',
          mode: 'cash',
          amount: 12000,
          paymentType: 'Tontine',
          acceptedBy: 'admin-1',
          recordedBy: 'admin-1',
          recordedByName: 'Admin Test',
          recordedAt: new Date(),
        },
      ]

      const result = getSubscriptionAmountFromPayments(payments, 'adherant')
      expect(result).toBe(12000)
    })
  })

  describe('Fallback: Montant par défaut', () => {
    it('devrait retourner le montant par défaut pour adherant si aucun paiement', () => {
      const result = getSubscriptionAmountFromPayments([], 'adherant')
      expect(result).toBe(10300)
    })

    it('devrait retourner le montant par défaut pour bienfaiteur si aucun paiement', () => {
      const result = getSubscriptionAmountFromPayments([], 'bienfaiteur')
      expect(result).toBe(10300)
    })

    it('devrait retourner le montant par défaut pour sympathisant si aucun paiement', () => {
      const result = getSubscriptionAmountFromPayments([], 'sympathisant')
      expect(result).toBe(10300)
    })

    it('devrait retourner le montant par défaut si payments est null', () => {
      const result = getSubscriptionAmountFromPayments(null, 'adherant')
      expect(result).toBe(10300)
    })

    it('devrait retourner le montant par défaut si payments est undefined', () => {
      const result = getSubscriptionAmountFromPayments(undefined, 'adherant')
      expect(result).toBe(10300)
    })

    it('devrait retourner le montant par défaut si aucun paiement n\'a de montant', () => {
      const payments: Payment[] = [
        {
          date: new Date(),
          time: '10:00',
          mode: 'cash',
          amount: null as any,
          paymentType: 'Tontine',
          acceptedBy: 'admin-1',
          recordedBy: 'admin-1',
          recordedByName: 'Admin Test',
          recordedAt: new Date(),
        },
      ]

      const result = getSubscriptionAmountFromPayments(payments, 'adherant')
      expect(result).toBe(10300)
    })

    it('devrait retourner 10300 si membershipType est inconnu', () => {
      const result = getSubscriptionAmountFromPayments([], 'unknown-type' as any)
      expect(result).toBe(10300)
    })
  })

  describe('Cas limites', () => {
    it('devrait gérer les paiements avec amount = 0', () => {
      const payments: Payment[] = [
        {
          date: new Date(),
          time: '10:00',
          mode: 'cash',
          amount: 0,
          paymentType: 'Subscription',
          acceptedBy: 'admin-1',
          recordedBy: 'admin-1',
          recordedByName: 'Admin Test',
          recordedAt: new Date(),
        },
      ]

      const result = getSubscriptionAmountFromPayments(payments, 'adherant')
      expect(result).toBe(0)
    })

    it('devrait ignorer les paiements avec amount null', () => {
      const payments: Payment[] = [
        {
          date: new Date(),
          time: '10:00',
          mode: 'cash',
          amount: null as any,
          paymentType: 'Subscription',
          acceptedBy: 'admin-1',
          recordedBy: 'admin-1',
          recordedByName: 'Admin Test',
          recordedAt: new Date(),
        },
        {
          date: new Date(),
          time: '10:00',
          mode: 'cash',
          amount: 15000,
          paymentType: 'Membership',
          acceptedBy: 'admin-1',
          recordedBy: 'admin-1',
          recordedByName: 'Admin Test',
          recordedAt: new Date(),
        },
      ]

      const result = getSubscriptionAmountFromPayments(payments, 'adherant')
      expect(result).toBe(15000)
    })

    it('devrait ignorer les paiements avec amount undefined', () => {
      const payments: Payment[] = [
        {
          date: new Date(),
          time: '10:00',
          mode: 'cash',
          amount: undefined as any,
          paymentType: 'Subscription',
          acceptedBy: 'admin-1',
          recordedBy: 'admin-1',
          recordedByName: 'Admin Test',
          recordedAt: new Date(),
        },
        {
          date: new Date(),
          time: '10:00',
          mode: 'cash',
          amount: 20000,
          paymentType: 'Membership',
          acceptedBy: 'admin-1',
          recordedBy: 'admin-1',
          recordedByName: 'Admin Test',
          recordedAt: new Date(),
        },
      ]

      const result = getSubscriptionAmountFromPayments(payments, 'adherant')
      expect(result).toBe(20000)
    })
  })
})
