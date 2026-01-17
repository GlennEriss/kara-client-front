/**
 * Tests unitaires pour MembershipRepositoryV2
 * 
 * Approche TDD : Tests écrits AVANT l'implémentation
 * 
 * ⚠️ NOTE: Les mocks Firestore nécessitent une configuration spéciale.
 * Pour l'instant, ces tests servent de spécification (RED phase).
 * L'implémentation complète nécessitera une configuration Vitest avec
 * les mocks Firebase correctement configurés.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase App en premier (hoisted)
vi.mock('@/firebase/app', () => ({
  app: {},
}))

// Mocks Firestore - doivent être définis avant les imports
const mockCollection = vi.fn()
const mockDoc = vi.fn()
const mockQuery = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockLimit = vi.fn()
const mockStartAfter = vi.fn()
const mockGetDocs = vi.fn()
const mockGetDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockGetCountFromServer = vi.fn()

vi.mock('@/firebase/firestore', () => ({
  db: {},
  collection: () => mockCollection(),
  doc: () => mockDoc(),
  query: () => mockQuery(),
  where: () => mockWhere(),
  orderBy: () => mockOrderBy(),
  limit: () => mockLimit(),
  startAfter: () => mockStartAfter(),
  getDocs: () => mockGetDocs(),
  getDoc: () => mockGetDoc(),
  updateDoc: () => mockUpdateDoc(),
  getCountFromServer: () => mockGetCountFromServer(),
  serverTimestamp: () => ({ toMillis: () => Date.now() }),
}))

import { MembershipRepositoryV2 } from '../../../repositories/MembershipRepositoryV2'
import { 
  createMembershipRequestFixture, 
  generateManyRequests,
  pendingUnpaidRequest,
  pendingPaidRequest,
  approvedRequest,
  rejectedRequest,
  underReviewRequest,
} from '../../fixtures'
import type { MembershipRequestFilters } from '../../../entities'

function resetFirestoreMocks() {
  mockCollection.mockReset()
  mockDoc.mockReset()
  mockQuery.mockReset()
  mockWhere.mockReset()
  mockOrderBy.mockReset()
  mockLimit.mockReset()
  mockStartAfter.mockReset()
  mockGetDocs.mockReset()
  mockGetDoc.mockReset()
  mockUpdateDoc.mockReset()
  mockGetCountFromServer.mockReset()
}

describe('MembershipRepositoryV2', () => {
  let repository: MembershipRepositoryV2

  beforeEach(() => {
    resetFirestoreMocks()
    vi.clearAllMocks()
    repository = MembershipRepositoryV2.getInstance()
  })

  describe('getAll', () => {
    it('devrait retourner une liste paginée de demandes', async () => {
      // Arrange
      const mockDocs = generateManyRequests(10).map(req => ({
        id: req.id,
        data: () => req,
      }))
      
      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
        empty: false,
        size: 10,
        forEach: (callback: (doc: any) => void) => {
          mockDocs.forEach(callback)
        },
      })
      
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 25 }),
      })
      
      // Act
      const result = await repository.getAll({}, 1, 10)
      
      // Assert
      expect(result.items).toHaveLength(10)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(10)
      expect(result.pagination.totalItems).toBe(25)
      expect(result.pagination.totalPages).toBe(3)
    })

    it('devrait retourner une liste vide si aucune demande', async () => {
      // Arrange
      mockGetDocs.mockResolvedValue({
        docs: [],
        empty: true,
        size: 0,
        forEach: () => {},
      })
      
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 0 }),
      })
      
      // Act
      const result = await repository.getAll()
      
      // Assert
      expect(result.items).toEqual([])
      expect(result.pagination.totalItems).toBe(0)
      expect(result.pagination.totalPages).toBe(0)
    })

    it('devrait filtrer par statut "pending"', async () => {
      // Arrange
      const pendingRequests = [pendingUnpaidRequest(), pendingPaidRequest()]
      const mockDocs = pendingRequests.map(req => ({
        id: req.id,
        data: () => req,
      }))
      
      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
        empty: false,
        size: 2,
        forEach: (callback: (doc: any) => void) => mockDocs.forEach(callback),
      })
      
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 2 }),
      })
      
      // Act
      const result = await repository.getAll({ status: 'pending' }, 1, 10)
      
      // Assert
      expect(result.items).toHaveLength(2)
      expect(result.items.every(item => item.status === 'pending')).toBe(true)
    })

    it('devrait filtrer par statut "approved"', async () => {
      // Arrange
      const approvedRequests = [approvedRequest()]
      const mockDocs = approvedRequests.map(req => ({
        id: req.id,
        data: () => req,
      }))
      
      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
        empty: false,
        size: 1,
        forEach: (callback: (doc: any) => void) => mockDocs.forEach(callback),
      })
      
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 1 }),
      })
      
      // Act
      const result = await repository.getAll({ status: 'approved' }, 1, 10)
      
      // Assert
      expect(result.items).toHaveLength(1)
      expect(result.items[0].status).toBe('approved')
    })

    it('devrait filtrer par statut "rejected"', async () => {
      // Arrange
      const rejectedRequests = [rejectedRequest()]
      const mockDocs = rejectedRequests.map(req => ({
        id: req.id,
        data: () => req,
      }))
      
      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
        empty: false,
        size: 1,
        forEach: (callback: (doc: any) => void) => mockDocs.forEach(callback),
      })
      
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 1 }),
      })
      
      // Act
      const result = await repository.getAll({ status: 'rejected' }, 1, 10)
      
      // Assert
      expect(result.items).toHaveLength(1)
      expect(result.items[0].status).toBe('rejected')
    })

    it('devrait filtrer par statut "under_review"', async () => {
      // Arrange
      const underReviewRequests = [underReviewRequest()]
      const mockDocs = underReviewRequests.map(req => ({
        id: req.id,
        data: () => req,
      }))
      
      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
        empty: false,
        size: 1,
        forEach: (callback: (doc: any) => void) => mockDocs.forEach(callback),
      })
      
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 1 }),
      })
      
      // Act
      const result = await repository.getAll({ status: 'under_review' }, 1, 10)
      
      // Assert
      expect(result.items).toHaveLength(1)
      expect(result.items[0].status).toBe('under_review')
    })

    it('devrait trier par date décroissante par défaut', async () => {
      // Arrange
      const requests = generateManyRequests(3)
      const mockDocs = requests.map(req => ({
        id: req.id,
        data: () => req,
      }))
      
      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
        empty: false,
        size: 3,
        forEach: (callback: (doc: any) => void) => mockDocs.forEach(callback),
      })
      
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 3 }),
      })
      
      // Act
      const result = await repository.getAll()
      
      // Assert
      expect(result.items).toHaveLength(3)
      // Vérifier l'ordre décroissant des dates
      for (let i = 0; i < result.items.length - 1; i++) {
        expect(result.items[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          result.items[i + 1].createdAt.getTime()
        )
      }
    })

    it('devrait filtrer par isPaid=true', async () => {
      // Arrange
      const paidRequests = [pendingPaidRequest(), approvedRequest()]
      const mockDocs = paidRequests.map(req => ({
        id: req.id,
        data: () => req,
      }))
      
      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
        empty: false,
        size: 2,
        forEach: (callback: (doc: any) => void) => mockDocs.forEach(callback),
      })
      
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 2 }),
      })
      
      // Act
      const result = await repository.getAll({ isPaid: true }, 1, 10)
      
      // Assert
      expect(result.items).toHaveLength(2)
      expect(result.items.every(item => item.isPaid === true)).toBe(true)
    })

    it('devrait combiner les filtres (status + isPaid)', async () => {
      // Arrange
      const paidPendingRequests = [pendingPaidRequest()]
      const mockDocs = paidPendingRequests.map(req => ({
        id: req.id,
        data: () => req,
      }))
      
      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
        empty: false,
        size: 1,
        forEach: (callback: (doc: any) => void) => mockDocs.forEach(callback),
      })
      
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 1 }),
      })
      
      // Act
      const result = await repository.getAll({ status: 'pending', isPaid: true }, 1, 10)
      
      // Assert
      expect(result.items).toHaveLength(1)
      expect(result.items[0].status).toBe('pending')
      expect(result.items[0].isPaid).toBe(true)
    })

    it('devrait throw une erreur si la connexion Firestore échoue', async () => {
      // Arrange
      mockGetDocs.mockRejectedValue(new Error('Firestore connection error'))
      
      // Act & Assert
      await expect(repository.getAll()).rejects.toThrow('Firestore connection error')
    })

    it('devrait retourner une liste vide si statut invalide', async () => {
      // Arrange
      mockGetDocs.mockResolvedValue({
        docs: [],
        empty: true,
        size: 0,
        forEach: () => {},
      })
      
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 0 }),
      })
      
      // Act
      const result = await repository.getAll({ status: 'invalid' as any }, 1, 10)
      
      // Assert
      expect(result.items).toEqual([])
    })
  })

  describe('getById', () => {
    it('devrait retourner une demande par son ID', async () => {
      // Arrange
      const request = createMembershipRequestFixture({ id: 'test-id-123' })
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'test-id-123',
        data: () => request,
      })
      
      // Act
      const result = await repository.getById('test-id-123')
      
      // Assert
      expect(result).toBeDefined()
      expect(result?.id).toBe('test-id-123')
      expect(result?.matricule).toBe(request.matricule)
    })

    it('devrait retourner null si ID inexistant', async () => {
      // Arrange
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      })
      
      // Act
      const result = await repository.getById('non-existent-id')
      
      // Assert
      expect(result).toBeNull()
    })

    it('devrait throw si ID est vide', async () => {
      // Act & Assert
      await expect(repository.getById('')).rejects.toThrow()
    })

    it('devrait inclure les sous-documents (identity, address, etc.)', async () => {
      // Arrange
      const request = createMembershipRequestFixture()
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: request.id,
        data: () => request,
      })
      
      // Act
      const result = await repository.getById(request.id)
      
      // Assert
      expect(result?.identity).toBeDefined()
      expect(result?.identity.firstName).toBe(request.identity.firstName)
      expect(result?.address).toBeDefined()
      expect(result?.company).toBeDefined()
      expect(result?.documents).toBeDefined()
    })
  })

  describe('updateStatus', () => {
    it('devrait mettre à jour le statut en "approved"', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const adminId = 'admin-123'
      const request = createMembershipRequestFixture({ id: requestId })
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: requestId,
        data: () => request,
      })
      
      mockUpdateDoc.mockResolvedValue(undefined)
      
      // Act
      await repository.updateStatus(requestId, 'approved', {
        processedBy: adminId,
        processedAt: new Date(),
      })
      
      // Assert
      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    it('devrait mettre à jour le statut en "rejected" avec motif', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const motif = 'Documents incomplets.'
      const request = createMembershipRequestFixture({ id: requestId })
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: requestId,
        data: () => request,
      })
      
      mockUpdateDoc.mockResolvedValue(undefined)
      
      // Act
      await repository.updateStatus(requestId, 'rejected', {
        motifReject: motif,
      })
      
      // Assert
      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    it('devrait mettre à jour le statut en "under_review" avec corrections', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const corrections = 'Veuillez mettre à jour votre photo.'
      const securityCode = '123456'
      const request = createMembershipRequestFixture({ id: requestId })
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: requestId,
        data: () => request,
      })
      
      mockUpdateDoc.mockResolvedValue(undefined)
      
      // Act
      await repository.updateStatus(requestId, 'under_review', {
        reviewNote: corrections, // Utiliser reviewNote à la place de corrections
        securityCode,
        securityCodeUsed: false,
        securityCodeExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000),
      })
      
      // Assert
      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    it('devrait throw si ID inexistant', async () => {
      // Arrange
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      })
      
      // Act & Assert
      await expect(repository.updateStatus('non-existent-id', 'approved'))
        .rejects.toThrow()
    })

    it('devrait mettre à jour updatedAt', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const request = createMembershipRequestFixture({ id: requestId })
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: requestId,
        data: () => request,
      })
      
      mockUpdateDoc.mockResolvedValue(undefined)
      
      // Act
      await repository.updateStatus(requestId, 'approved')
      
      // Assert
      expect(mockUpdateDoc).toHaveBeenCalled()
    })
  })

  describe('markAsPaid', () => {
    it('devrait marquer comme payé avec les infos de paiement', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const paymentInfo = {
        amount: 25000,
        mode: 'Cash' as const,
        date: new Date().toISOString(),
      }
      const request = createMembershipRequestFixture({ id: requestId })
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: requestId,
        data: () => request,
      })
      
      mockUpdateDoc.mockResolvedValue(undefined)
      
      // Act
      await repository.markAsPaid(requestId, paymentInfo)
      
      // Assert
      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    it('devrait throw si montant invalide (<= 0)', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const paymentInfo = {
        amount: 0,
        mode: 'Cash' as const,
        date: new Date().toISOString(),
      }
      
      // Act & Assert
      await expect(repository.markAsPaid(requestId, paymentInfo))
        .rejects.toThrow()
    })

    it('devrait throw si mode de paiement invalide', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const paymentInfo = {
        amount: 25000,
        mode: 'InvalidMode' as any,
        date: new Date().toISOString(),
      }
      
      // Act & Assert
      await expect(repository.markAsPaid(requestId, paymentInfo))
        .rejects.toThrow()
    })
  })

  describe('getStatistics', () => {
    it('devrait retourner les compteurs par statut', async () => {
      // Arrange
      mockGetCountFromServer
        .mockResolvedValueOnce({ data: () => ({ count: 10 }) }) // total
        .mockResolvedValueOnce({ data: () => ({ count: 5 }) })  // pending
        .mockResolvedValueOnce({ data: () => ({ count: 0 }) })  // under_review
        .mockResolvedValueOnce({ data: () => ({ count: 3 }) })  // approved
        .mockResolvedValueOnce({ data: () => ({ count: 2 }) })  // rejected
        .mockResolvedValueOnce({ data: () => ({ count: 4 }) })  // paid
        .mockResolvedValueOnce({ data: () => ({ count: 6 }) })  // unpaid
      
      // Act
      const result = await repository.getStatistics()
      
      // Assert
      expect(result.total).toBe(10)
      expect(result.byStatus.pending).toBe(5)
      expect(result.byStatus.under_review).toBe(0)
      expect(result.byStatus.approved).toBe(3)
      expect(result.byStatus.rejected).toBe(2)
    })

    it('devrait retourner les compteurs de paiement', async () => {
      // Arrange
      mockGetCountFromServer
        .mockResolvedValueOnce({ data: () => ({ count: 10 }) }) // total
        .mockResolvedValueOnce({ data: () => ({ count: 5 }) })  // pending
        .mockResolvedValueOnce({ data: () => ({ count: 0 }) })  // under_review
        .mockResolvedValueOnce({ data: () => ({ count: 3 }) })  // approved
        .mockResolvedValueOnce({ data: () => ({ count: 2 }) })  // rejected
        .mockResolvedValueOnce({ data: () => ({ count: 4 }) })  // paid
        .mockResolvedValueOnce({ data: () => ({ count: 6 }) })  // unpaid
      
      // Act
      const result = await repository.getStatistics()
      
      // Assert
      expect(result.byPayment.paid).toBe(4)
      expect(result.byPayment.unpaid).toBe(6)
    })

    it('devrait calculer les pourcentages', async () => {
      // Arrange
      mockGetCountFromServer
        .mockResolvedValueOnce({ data: () => ({ count: 10 }) }) // total
        .mockResolvedValueOnce({ data: () => ({ count: 5 }) })  // pending
        .mockResolvedValueOnce({ data: () => ({ count: 0 }) })  // under_review
        .mockResolvedValueOnce({ data: () => ({ count: 3 }) })  // approved
        .mockResolvedValueOnce({ data: () => ({ count: 2 }) })  // rejected
        .mockResolvedValueOnce({ data: () => ({ count: 4 }) })  // paid
        .mockResolvedValueOnce({ data: () => ({ count: 6 }) })  // unpaid
      
      // Act
      const result = await repository.getStatistics()
      
      // Assert
      expect(result.percentages.pending).toBe(50)  // 5/10 * 100
      expect(result.percentages.approved).toBe(30) // 3/10 * 100
      expect(result.percentages.rejected).toBe(20) // 2/10 * 100
    })

    it('devrait gérer le cas où total = 0 (éviter division par zéro)', async () => {
      // Arrange
      mockGetCountFromServer
        .mockResolvedValueOnce({ data: () => ({ count: 0 }) }) // total
        .mockResolvedValueOnce({ data: () => ({ count: 0 }) }) // pending
        .mockResolvedValueOnce({ data: () => ({ count: 0 }) }) // under_review
        .mockResolvedValueOnce({ data: () => ({ count: 0 }) }) // approved
        .mockResolvedValueOnce({ data: () => ({ count: 0 }) }) // rejected
        .mockResolvedValueOnce({ data: () => ({ count: 0 }) }) // paid
        .mockResolvedValueOnce({ data: () => ({ count: 0 }) }) // unpaid
      
      // Act
      const result = await repository.getStatistics()
      
      // Assert
      expect(result.total).toBe(0)
      expect(result.percentages.pending).toBe(0)
      expect(result.percentages.approved).toBe(0)
      expect(result.percentages.rejected).toBe(0)
      // Pas de division par zéro
      expect(isNaN(result.percentages.pending)).toBe(false)
    })
  })
})
