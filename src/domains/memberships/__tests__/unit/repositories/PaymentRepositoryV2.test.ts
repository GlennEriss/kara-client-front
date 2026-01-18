/**
 * Tests unitaires pour PaymentRepositoryV2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted() permet de définir des variables disponibles pour vi.mock()
const { 
  mockCollection, 
  mockDoc, 
  mockSetDoc, 
  mockGetDoc, 
  mockQuery, 
  mockWhere, 
  mockOrderBy, 
  mockLimit, 
  mockGetDocs, 
  mockServerTimestamp,
  mockCollectionRef 
} = vi.hoisted(() => {
  const mockCollectionRef = { id: 'payments', path: 'payments' }
  return {
    mockCollectionRef,
    mockCollection: vi.fn(() => mockCollectionRef),
    mockDoc: vi.fn(),
    mockSetDoc: vi.fn(),
    mockGetDoc: vi.fn(),
    mockQuery: vi.fn(),
    mockWhere: vi.fn(() => ({ type: 'where' })),
    mockOrderBy: vi.fn(() => ({ type: 'orderBy' })),
    mockLimit: vi.fn(() => ({ type: 'limit' })),
    mockGetDocs: vi.fn(),
    mockServerTimestamp: vi.fn(() => ({ toMillis: () => Date.now() })),
  }
})

vi.mock('@/firebase/app', () => ({
  app: {},
}))

vi.mock('@/firebase/firestore', () => ({
  db: {},
}))

// Mock firebase/firestore (sans @/) car PaymentRepositoryV2 importe directement depuis firebase/firestore
vi.mock('firebase/firestore', () => ({
  collection: () => mockCollection(),
  doc: () => mockDoc(),
  setDoc: () => mockSetDoc(),
  getDoc: () => mockGetDoc(),
  query: () => mockQuery(),
  where: () => mockWhere(),
  orderBy: () => mockOrderBy(),
  limit: () => mockLimit(),
  getDocs: () => mockGetDocs(),
  serverTimestamp: () => mockServerTimestamp(),
  Timestamp: {
    fromDate: (date: Date) => ({ toDate: () => date }),
  },
}))

import { PaymentRepositoryV2, type CentralizedPayment } from '../../../repositories/PaymentRepositoryV2'

function resetFirestoreMocks() {
  mockCollection.mockReset()
  mockCollection.mockReturnValue(mockCollectionRef)
  mockDoc.mockReset()
  mockSetDoc.mockReset()
  mockGetDoc.mockReset()
  mockQuery.mockReset()
  mockWhere.mockReset()
  mockOrderBy.mockReset()
  mockLimit.mockReset()
  mockGetDocs.mockReset()
  mockServerTimestamp.mockReset()
}

function createMockPayment(overrides: Partial<CentralizedPayment> = {}): CentralizedPayment {
  return {
    id: 'payment-123',
    sourceType: 'membership-request',
    sourceId: 'req-123',
    beneficiaryId: 'user-123',
    beneficiaryName: 'John Doe',
    date: new Date('2026-01-18'),
    mode: 'mobicash',
    amount: 10000,
    paymentType: 'Membership',
    time: '10:00',
    acceptedBy: 'admin-123',
    recordedBy: 'admin-123',
    recordedByName: 'Admin KARA',
    recordedAt: new Date('2026-01-18'),
    createdAt: new Date('2026-01-18'),
    updatedAt: new Date('2026-01-18'),
    ...overrides,
  }
}

describe('PaymentRepositoryV2', () => {
  let repository: PaymentRepositoryV2

  beforeEach(() => {
    resetFirestoreMocks()
    vi.clearAllMocks()
    
    // Configurer mockDoc pour générer des IDs uniques
    let docIdCounter = 0
    mockDoc.mockImplementation((arg1?: any, arg2?: any, arg3?: string) => {
      // Si 3 arguments (db, collectionName, id) - appel depuis getPaymentById
      if (arg3 !== undefined && typeof arg3 === 'string') {
        return { id: arg3, path: `payments/${arg3}` }
      }
      // Si 1 argument (collection) - appel depuis createPayment
      if (arg1 && typeof arg1 === 'object' && 'id' in arg1 && arg2 === undefined) {
        docIdCounter++
        return { id: `payment-${docIdCounter}`, path: `payments/payment-${docIdCounter}` }
      }
      // Par défaut, générer un ID unique
      docIdCounter++
      return { id: `payment-${docIdCounter}`, path: `payments/payment-${docIdCounter}` }
    })
    
    // Réinitialiser le singleton
    ;(PaymentRepositoryV2 as any).instance = undefined
    repository = PaymentRepositoryV2.getInstance()
  })

  describe('getInstance', () => {
    it('devrait retourner la même instance', () => {
      const instance1 = PaymentRepositoryV2.getInstance()
      const instance2 = PaymentRepositoryV2.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('createPayment', () => {
    it('devrait créer un paiement avec des dates Date', async () => {
      const paymentData = {
        sourceType: 'membership-request' as const,
        sourceId: 'req-123',
        date: new Date('2026-01-18'),
        mode: 'mobicash' as const,
        amount: 10000,
        paymentType: 'Membership' as const,
        time: '10:00',
        acceptedBy: 'admin-123',
        recordedBy: 'admin-123',
        recordedByName: 'Admin KARA',
        recordedAt: new Date('2026-01-18'),
      }

      mockSetDoc.mockResolvedValue(undefined)
      const createdPayment = createMockPayment({ id: 'payment-1' })
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'payment-1',
        data: () => createdPayment,
      })

      const result = await repository.createPayment(paymentData)
      expect(mockSetDoc).toHaveBeenCalled()
      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
    })

    it('devrait créer un paiement avec des dates string', async () => {
      const paymentData = {
        sourceType: 'membership-request' as const,
        sourceId: 'req-123',
        date: '2026-01-18' as any,
        mode: 'mobicash' as const,
        amount: 10000,
        paymentType: 'Membership' as const,
        time: '10:00',
        acceptedBy: 'admin-123',
        recordedBy: 'admin-123',
        recordedByName: 'Admin KARA',
        recordedAt: '2026-01-18' as any,
      }

      mockSetDoc.mockResolvedValue(undefined)
      const createdPayment = createMockPayment({ id: 'payment-1' })
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'payment-1',
        data: () => createdPayment,
      })

      const result = await repository.createPayment(paymentData)
      expect(mockSetDoc).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('devrait nettoyer les champs undefined', async () => {
      const paymentData = {
        sourceType: 'membership-request' as const,
        sourceId: 'req-123',
        date: new Date('2026-01-18'),
        mode: 'mobicash' as const,
        amount: 10000,
        paymentType: 'Membership' as const,
        time: '10:00',
        acceptedBy: 'admin-123',
        recordedBy: 'admin-123',
        recordedByName: 'Admin KARA',
        recordedAt: new Date('2026-01-18'),
        beneficiaryId: undefined,
      }

      mockSetDoc.mockResolvedValue(undefined)
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'payment-1',
        data: () => createMockPayment({ id: 'payment-1' }),
      })

      await repository.createPayment(paymentData as any)
      expect(mockSetDoc).toHaveBeenCalled()
    })

    it('devrait throw si le paiement créé est introuvable', async () => {
      const paymentData = {
        sourceType: 'membership-request' as const,
        sourceId: 'req-123',
        date: new Date('2026-01-18'),
        mode: 'mobicash' as const,
        amount: 10000,
        paymentType: 'Membership' as const,
        time: '10:00',
        acceptedBy: 'admin-123',
        recordedBy: 'admin-123',
        recordedByName: 'Admin KARA',
        recordedAt: new Date('2026-01-18'),
      }

      mockSetDoc.mockResolvedValue(undefined)
      mockGetDoc.mockResolvedValue({ exists: () => false })

      await expect(repository.createPayment(paymentData)).rejects.toThrow('Erreur lors de la récupération du paiement créé')
    })

    it('devrait throw en cas d\'erreur Firestore', async () => {
      const paymentData = {
        sourceType: 'membership-request' as const,
        sourceId: 'req-123',
        date: new Date('2026-01-18'),
        mode: 'mobicash' as const,
        amount: 10000,
        paymentType: 'Membership' as const,
        time: '10:00',
        acceptedBy: 'admin-123',
        recordedBy: 'admin-123',
        recordedByName: 'Admin KARA',
        recordedAt: new Date('2026-01-18'),
      }

      mockSetDoc.mockRejectedValue(new Error('Firestore error'))

      await expect(repository.createPayment(paymentData)).rejects.toThrow('Firestore error')
    })
  })

  describe('getPaymentById', () => {
    it('devrait retourner un paiement', async () => {
      const payment = createMockPayment()
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'payment-123',
        data: () => payment,
      })

      const result = await repository.getPaymentById('payment-123')
      expect(result).toBeDefined()
      expect(result?.id).toBe('payment-123')
    })

    it('devrait retourner null si inexistant', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false })
      const result = await repository.getPaymentById('nonexistent')
      expect(result).toBeNull()
    })

    it('devrait throw en cas d\'erreur Firestore', async () => {
      mockGetDoc.mockRejectedValue(new Error('Firestore error'))
      await expect(repository.getPaymentById('payment-123')).rejects.toThrow('Firestore error')
    })

    it('devrait transformer les dates Timestamp', async () => {
      const mockDate = new Date('2026-01-18')
      const payment = {
        ...createMockPayment(),
        date: { toDate: () => mockDate },
        recordedAt: { toDate: () => mockDate },
        createdAt: { toDate: () => mockDate },
        updatedAt: { toDate: () => mockDate },
      }
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'payment-123',
        data: () => payment,
      })

      const result = await repository.getPaymentById('payment-123')
      expect(result?.date).toEqual(mockDate)
    })

    it('devrait gérer les dates sans toDate()', async () => {
      const payment = {
        ...createMockPayment(),
        date: '2026-01-18',
        recordedAt: null,
        createdAt: undefined,
        updatedAt: undefined,
      }
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'payment-123',
        data: () => payment,
      })

      const result = await repository.getPaymentById('payment-123')
      expect(result).toBeDefined()
      expect(result?.date).toBeInstanceOf(Date)
    })
  })

  describe('getPayments', () => {
    it('devrait retourner une liste de paiements', async () => {
      const payments = [createMockPayment({ id: 'payment-1' }), createMockPayment({ id: 'payment-2' })]
      mockGetDocs.mockResolvedValue({
        docs: payments.map(p => ({ id: p.id, data: () => p })),
        empty: false,
        size: payments.length,
        forEach: (callback: any) => payments.forEach(p => callback({ id: p.id, data: () => p })),
      })

      const result = await repository.getPayments()
      expect(result).toHaveLength(2)
    })

    it('devrait filtrer par sourceType', async () => {
      const payments = [createMockPayment({ sourceType: 'membership-request' })]
      mockGetDocs.mockResolvedValue({
        docs: payments.map(p => ({ id: p.id, data: () => p })),
        empty: false,
        size: 1,
        forEach: (callback: any) => payments.forEach(p => callback({ id: p.id, data: () => p })),
      })

      const result = await repository.getPayments({ sourceType: 'membership-request' })
      expect(result.length).toBeGreaterThan(0)
      expect(mockWhere).toHaveBeenCalled()
    })

    it('devrait filtrer par sourceId', async () => {
      const payments = [createMockPayment({ sourceId: 'req-123' })]
      mockGetDocs.mockResolvedValue({
        docs: payments.map(p => ({ id: p.id, data: () => p })),
        empty: false,
        size: 1,
        forEach: (callback: any) => payments.forEach(p => callback({ id: p.id, data: () => p })),
      })

      const result = await repository.getPayments({ sourceId: 'req-123' })
      expect(result.length).toBeGreaterThan(0)
    })

    it('devrait filtrer par beneficiaryId', async () => {
      const payments = [createMockPayment({ beneficiaryId: 'user-123' })]
      mockGetDocs.mockResolvedValue({
        docs: payments.map(p => ({ id: p.id, data: () => p })),
        empty: false,
        size: 1,
        forEach: (callback: any) => payments.forEach(p => callback({ id: p.id, data: () => p })),
      })

      const result = await repository.getPayments({ beneficiaryId: 'user-123' })
      expect(result.length).toBeGreaterThan(0)
    })

    it('devrait filtrer par paymentType', async () => {
      const payments = [createMockPayment({ paymentType: 'Membership' })]
      mockGetDocs.mockResolvedValue({
        docs: payments.map(p => ({ id: p.id, data: () => p })),
        empty: false,
        size: 1,
        forEach: (callback: any) => payments.forEach(p => callback({ id: p.id, data: () => p })),
      })

      const result = await repository.getPayments({ paymentType: 'Membership' })
      expect(result.length).toBeGreaterThan(0)
    })

    it('devrait filtrer par recordedBy', async () => {
      const payments = [createMockPayment({ recordedBy: 'admin-123' })]
      mockGetDocs.mockResolvedValue({
        docs: payments.map(p => ({ id: p.id, data: () => p })),
        empty: false,
        size: 1,
        forEach: (callback: any) => payments.forEach(p => callback({ id: p.id, data: () => p })),
      })

      const result = await repository.getPayments({ recordedBy: 'admin-123' })
      expect(result.length).toBeGreaterThan(0)
    })

    it('devrait filtrer par mode', async () => {
      const payments = [createMockPayment({ mode: 'mobicash' })]
      mockGetDocs.mockResolvedValue({
        docs: payments.map(p => ({ id: p.id, data: () => p })),
        empty: false,
        size: 1,
        forEach: (callback: any) => payments.forEach(p => callback({ id: p.id, data: () => p })),
      })

      const result = await repository.getPayments({ mode: 'mobicash' })
      expect(result.length).toBeGreaterThan(0)
    })

    it('devrait filtrer par dateFrom', async () => {
      const payments = [createMockPayment()]
      mockGetDocs.mockResolvedValue({
        docs: payments.map(p => ({ id: p.id, data: () => p })),
        empty: false,
        size: 1,
        forEach: (callback: any) => payments.forEach(p => callback({ id: p.id, data: () => p })),
      })

      const result = await repository.getPayments({ dateFrom: new Date('2026-01-01') })
      expect(result.length).toBeGreaterThan(0)
    })

    it('devrait filtrer par dateTo', async () => {
      const payments = [createMockPayment()]
      mockGetDocs.mockResolvedValue({
        docs: payments.map(p => ({ id: p.id, data: () => p })),
        empty: false,
        size: 1,
        forEach: (callback: any) => payments.forEach(p => callback({ id: p.id, data: () => p })),
      })

      const result = await repository.getPayments({ dateTo: new Date('2026-12-31') })
      expect(result.length).toBeGreaterThan(0)
    })

    it('devrait throw en cas d\'erreur Firestore', async () => {
      mockGetDocs.mockRejectedValue(new Error('Firestore error'))
      await expect(repository.getPayments()).rejects.toThrow('Firestore error')
    })

    it('devrait utiliser la limite par défaut', async () => {
      const payments = [createMockPayment()]
      mockGetDocs.mockResolvedValue({
        docs: payments.map(p => ({ id: p.id, data: () => p })),
        empty: false,
        size: 1,
        forEach: (callback: any) => payments.forEach(p => callback({ id: p.id, data: () => p })),
      })

      await repository.getPayments()
      expect(mockLimit).toHaveBeenCalled()
    })

    it('devrait utiliser une limite personnalisée', async () => {
      const payments = [createMockPayment()]
      mockGetDocs.mockResolvedValue({
        docs: payments.map(p => ({ id: p.id, data: () => p })),
        empty: false,
        size: 1,
        forEach: (callback: any) => payments.forEach(p => callback({ id: p.id, data: () => p })),
      })

      await repository.getPayments({}, 50)
      expect(mockLimit).toHaveBeenCalled()
    })
  })

  describe('getPaymentsBySource', () => {
    it('devrait retourner les paiements d\'une source', async () => {
      const payments = [createMockPayment({ sourceType: 'membership-request', sourceId: 'req-123' })]
      mockGetDocs.mockResolvedValue({
        docs: payments.map(p => ({ id: p.id, data: () => p })),
        empty: false,
        size: 1,
        forEach: (callback: any) => payments.forEach(p => callback({ id: p.id, data: () => p })),
      })

      const result = await repository.getPaymentsBySource('membership-request', 'req-123')
      expect(result.length).toBeGreaterThan(0)
    })
  })
})
