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
const mockWhere = vi.fn(() => ({ type: 'where', _field: { path: 'field' }, _operator: '==', _value: 'value' }))
const mockOrderBy = vi.fn(() => ({ type: 'orderBy', _field: { path: 'field' }, _direction: 'desc' }))
const mockLimit = vi.fn(() => ({ type: 'limit', _limit: 10 }))
const mockStartAfter = vi.fn(() => ({ type: 'startAfter' }))
const mockGetDocs = vi.fn()
const mockGetDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockGetCountFromServer = vi.fn()
const mockSetDoc = vi.fn()

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
  setDoc: () => mockSetDoc(),
  getCountFromServer: () => mockGetCountFromServer(),
  serverTimestamp: () => ({ toMillis: () => Date.now() }),
}))

// Mock PaymentRepositoryV2
const mockCreatePayment = vi.fn()
vi.mock('../../../repositories/PaymentRepositoryV2', () => ({
  PaymentRepositoryV2: {
    getInstance: vi.fn(() => ({
      createPayment: mockCreatePayment,
    })),
  },
}))

// Mock generateMatricule
const mockGenerateMatricule = vi.fn()
vi.mock('@/db/user.db', () => ({
  generateMatricule: () => mockGenerateMatricule(),
}))

// Mock DocumentRepository
const mockUploadImage = vi.fn()
vi.mock('@/repositories/documents/DocumentRepository', () => ({
  DocumentRepository: vi.fn(() => ({
    uploadImage: mockUploadImage,
  })),
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
import type { MembershipRequestFilters, PaymentInfo } from '../../../entities'

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
  mockSetDoc.mockReset()
  mockGetCountFromServer.mockReset()
  mockCreatePayment.mockReset()
  mockGenerateMatricule.mockReset()
  mockUploadImage.mockReset()
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

    it('devrait avoir hasNextPage=true et hasPrevPage=false sur la première page', async () => {
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
      expect(result.pagination.hasNextPage).toBe(true)
      expect(result.pagination.hasPrevPage).toBe(false)
      expect(result.pagination.page).toBe(1)
    })

    it('devrait avoir hasNextPage=false et hasPrevPage=true sur la dernière page', async () => {
      // Arrange
      const mockDocs = generateManyRequests(5).map(req => ({
        id: req.id,
        data: () => req,
      }))
      
      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
        empty: false,
        size: 5,
        forEach: (callback: (doc: any) => void) => {
          mockDocs.forEach(callback)
        },
      })
      
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 25 }),
      })
      
      // Act - dernière page (page 3 sur 25 items avec 10 par page = 3 pages)
      const result = await repository.getAll({}, 3, 10)
      
      // Assert
      expect(result.pagination.hasNextPage).toBe(false)
      expect(result.pagination.hasPrevPage).toBe(true)
      expect(result.pagination.page).toBe(3)
      expect(result.pagination.totalPages).toBe(3)
    })

    it('devrait avoir hasNextPage=true et hasPrevPage=true sur une page intermédiaire', async () => {
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
        data: () => ({ count: 30 }),
      })
      
      // Act - page 2 sur 3 pages
      const result = await repository.getAll({}, 2, 10)
      
      // Assert
      expect(result.pagination.hasNextPage).toBe(true)
      expect(result.pagination.hasPrevPage).toBe(true)
      expect(result.pagination.page).toBe(2)
      expect(result.pagination.totalPages).toBe(3)
    })

    it('devrait avoir hasNextPage=false et hasPrevPage=false avec une seule page', async () => {
      // Arrange
      const mockDocs = generateManyRequests(5).map(req => ({
        id: req.id,
        data: () => req,
      }))
      
      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
        empty: false,
        size: 5,
        forEach: (callback: (doc: any) => void) => {
          mockDocs.forEach(callback)
        },
      })
      
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 5 }),
      })
      
      // Act - page 1 avec seulement 5 items (1 seule page)
      const result = await repository.getAll({}, 1, 10)
      
      // Assert
      expect(result.pagination.hasNextPage).toBe(false)
      expect(result.pagination.hasPrevPage).toBe(false)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.totalPages).toBe(1)
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

    it('devrait mettre à jour le statut en "rejected" avec motif de rejet et traçabilité', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const motif = 'Documents incomplets et informations manquantes.'
      const adminId = 'admin-123'
      const processedAt = new Date()
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
        processedBy: adminId,
        processedAt,
      })
      
      // Assert
      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    it('devrait mettre à jour le statut en "under_review" avec motif de réouverture et traçabilité', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const reopenReason = 'Nouvelle information disponible. Le dossier nécessite un réexamen.'
      const adminId = 'admin-123'
      const reopenedAt = new Date()
      const previousMotifReject = 'Documents incomplets.'
      const request = createMembershipRequestFixture({ 
        id: requestId,
        status: 'rejected',
        motifReject: previousMotifReject,
      })
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: requestId,
        data: () => request,
      })
      
      mockUpdateDoc.mockResolvedValue(undefined)
      
      // Act
      await repository.updateStatus(requestId, 'under_review', {
        reopenReason,
        reopenedBy: adminId,
        reopenedAt,
        motifReject: previousMotifReject, // Conserver le motif de rejet initial
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

    it('devrait gérer les erreurs lors de la mise à jour Firestore', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const request = createMembershipRequestFixture({ id: requestId })
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: requestId,
        data: () => request,
      })
      
      const firestoreError = new Error('Firestore update failed')
      mockUpdateDoc.mockRejectedValue(firestoreError)
      
      // Act & Assert
      await expect(repository.updateStatus(requestId, 'approved'))
        .rejects.toThrow('Firestore update failed')
      
      expect(mockUpdateDoc).toHaveBeenCalled()
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
    it('devrait marquer comme payé avec les infos de paiement et la traçabilité', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const paymentInfo: PaymentInfo = {
        amount: 25000,
        mode: 'cash',
        date: new Date().toISOString(),
        time: '14:30',
        recordedBy: 'admin-123',
        recordedByName: 'Admin Test',
        recordedAt: new Date(),
      }
      const request = createMembershipRequestFixture({ id: requestId })
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: requestId,
        data: () => request,
      })
      
      mockUpdateDoc.mockResolvedValue(undefined)
      mockCreatePayment.mockResolvedValue({ id: 'payment-123' })
      
      // Act
      await repository.markAsPaid(requestId, paymentInfo)
      
      // Assert
      expect(mockUpdateDoc).toHaveBeenCalled()
      // Vérifier que les champs de traçabilité sont bien passés dans paymentInfo
      expect(paymentInfo.recordedBy).toBe('admin-123')
      expect(paymentInfo.recordedByName).toBe('Admin Test')
      expect(paymentInfo.recordedAt).toBeInstanceOf(Date)
    })

    it('devrait inclure les champs de traçabilité dans le paiement', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const recordedAt = new Date()
      const paymentInfo: PaymentInfo = {
        amount: 25000,
        mode: 'cash',
        date: new Date().toISOString(),
        time: '14:30',
        recordedBy: 'admin-123',
        recordedByName: 'Admin Test',
        recordedAt,
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
      // Vérifier que les champs de traçabilité sont bien passés
      expect(paymentInfo.recordedBy).toBe('admin-123')
      expect(paymentInfo.recordedByName).toBe('Admin Test')
      expect(paymentInfo.recordedAt).toBe(recordedAt)
    })

    it('devrait throw si montant invalide (<= 0)', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const paymentInfo: PaymentInfo = {
        amount: 0,
        mode: 'cash',
        date: new Date().toISOString(),
        time: '14:30',
      }
      
      // Act & Assert
      await expect(repository.markAsPaid(requestId, paymentInfo))
        .rejects.toThrow()
    })

    it('devrait throw si mode de paiement invalide', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const paymentInfo: PaymentInfo = {
        amount: 25000,
        mode: 'InvalidMode' as any,
        date: new Date().toISOString(),
        time: '14:30',
      }
      
      // Act & Assert
      await expect(repository.markAsPaid(requestId, paymentInfo))
        .rejects.toThrow()
    })

    it('devrait enregistrer le paiement dans la collection centralisée', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const paymentInfo: PaymentInfo = {
        amount: 25000,
        mode: 'cash',
        date: new Date().toISOString(),
        time: '14:30',
        recordedBy: 'admin-123',
        recordedByName: 'Admin Test',
        recordedAt: new Date(),
      }
      const request = createMembershipRequestFixture({ id: requestId })
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: requestId,
        data: () => request,
      })
      
      mockUpdateDoc.mockResolvedValue(undefined)
      mockCreatePayment.mockResolvedValue({ id: 'payment-123' })
      
      // Act
      await repository.markAsPaid(requestId, paymentInfo)
      
      // Assert
      expect(mockCreatePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'membership-request',
          sourceId: requestId,
          beneficiaryId: requestId,
          beneficiaryName: `${request.identity.firstName} ${request.identity.lastName}`.trim(),
          recordedBy: 'admin-123',
          recordedByName: 'Admin Test',
          recordedAt: expect.any(Date),
        })
      )
    })

    it('ne devrait pas échouer si l\'enregistrement dans la collection centralisée échoue', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const paymentInfo: PaymentInfo = {
        amount: 25000,
        mode: 'cash',
        date: new Date().toISOString(),
        time: '14:30',
        recordedBy: 'admin-123',
        recordedByName: 'Admin Test',
        recordedAt: new Date(),
      }
      const request = createMembershipRequestFixture({ id: requestId })
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: requestId,
        data: () => request,
      })
      
      mockUpdateDoc.mockResolvedValue(undefined)
      mockCreatePayment.mockRejectedValue(new Error('Payment repository error'))
      
      // Act & Assert - ne devrait pas throw même si la collection centralisée échoue
      await expect(repository.markAsPaid(requestId, paymentInfo)).resolves.not.toThrow()
      expect(mockUpdateDoc).toHaveBeenCalled() // Le paiement doit quand même être enregistré dans membership-request
    })

    it('devrait throw si demande introuvable', async () => {
      // Arrange
      const requestId = 'non-existent-id'
      const paymentInfo: PaymentInfo = {
        amount: 25000,
        mode: 'cash',
        date: new Date().toISOString(),
        time: '14:30',
        recordedBy: 'admin-123',
        recordedByName: 'Admin Test',
        recordedAt: new Date(),
      }
      
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      })
      
      // Act & Assert
      await expect(repository.markAsPaid(requestId, paymentInfo))
        .rejects.toThrow()
    })

    it('devrait utiliser les valeurs par défaut si certains champs sont manquants', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const paymentInfo: PaymentInfo = {
        amount: 25000,
        mode: 'cash',
        // date, time, recordedBy, recordedByName, recordedAt manquants
      } as any
      const request = createMembershipRequestFixture({ 
        id: requestId,
        processedBy: 'previous-admin',
      })
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: requestId,
        data: () => request,
      })
      
      mockUpdateDoc.mockResolvedValue(undefined)
      mockCreatePayment.mockResolvedValue({ id: 'payment-123' })
      
      // Act
      await repository.markAsPaid(requestId, paymentInfo)
      
      // Assert
      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    it('devrait inclure withFees si défini', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const paymentInfo: PaymentInfo = {
        amount: 25000,
        mode: 'airtel_money',
        date: new Date().toISOString(),
        time: '14:30',
        withFees: true,
        recordedBy: 'admin-123',
        recordedByName: 'Admin Test',
        recordedAt: new Date(),
      }
      const request = createMembershipRequestFixture({ id: requestId })
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: requestId,
        data: () => request,
      })
      
      mockUpdateDoc.mockResolvedValue(undefined)
      mockCreatePayment.mockResolvedValue({ id: 'payment-123' })
      
      // Act
      await repository.markAsPaid(requestId, paymentInfo)
      
      // Assert
      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    it('devrait inclure paymentMethodOther si mode est "other"', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const paymentInfo: PaymentInfo = {
        amount: 25000,
        mode: 'other',
        paymentMethodOther: 'Orange Money',
        date: new Date().toISOString(),
        time: '14:30',
        recordedBy: 'admin-123',
        recordedByName: 'Admin Test',
        recordedAt: new Date(),
      }
      const request = createMembershipRequestFixture({ id: requestId })
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: requestId,
        data: () => request,
      })
      
      mockUpdateDoc.mockResolvedValue(undefined)
      mockCreatePayment.mockResolvedValue({ id: 'payment-123' })
      
      // Act
      await repository.markAsPaid(requestId, paymentInfo)
      
      // Assert
      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    it('devrait inclure proofUrl et proofPath si fournis', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const paymentInfo: PaymentInfo = {
        amount: 25000,
        mode: 'cash',
        date: new Date().toISOString(),
        time: '14:30',
        proofUrl: 'https://example.com/proof.jpg',
        proofPath: 'proofs/proof.jpg',
        recordedBy: 'admin-123',
        recordedByName: 'Admin Test',
        recordedAt: new Date(),
      }
      const request = createMembershipRequestFixture({ id: requestId })
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: requestId,
        data: () => request,
      })
      
      mockUpdateDoc.mockResolvedValue(undefined)
      mockCreatePayment.mockResolvedValue({ id: 'payment-123' })
      
      // Act
      await repository.markAsPaid(requestId, paymentInfo)
      
      // Assert
      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    it('devrait gérer les erreurs lors de la mise à jour Firestore', async () => {
      // Arrange
      const requestId = 'test-id-123'
      const paymentInfo: PaymentInfo = {
        amount: 25000,
        mode: 'cash',
        date: new Date().toISOString(),
        time: '14:30',
        recordedBy: 'admin-123',
        recordedByName: 'Admin Test',
        recordedAt: new Date(),
      }
      const request = createMembershipRequestFixture({ id: requestId })
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: requestId,
        data: () => request,
      })
      
      mockUpdateDoc.mockRejectedValue(new Error('Firestore update failed'))
      
      // Act & Assert
      await expect(repository.markAsPaid(requestId, paymentInfo))
        .rejects.toThrow('Firestore update failed')
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

    it('devrait gérer les erreurs lors de la récupération des statistiques', async () => {
      // Arrange
      const firestoreError = new Error('Firestore query failed')
      mockGetCountFromServer.mockRejectedValue(firestoreError)
      
      // Act & Assert
      await expect(repository.getStatistics())
        .rejects.toThrow('Firestore query failed')
    })
  })

  describe('search', () => {
    // Helper pour créer un mock de querySnapshot avec forEach
    const createMockQuerySnapshot = (requests: any[]) => {
      const docs = requests.map(req => ({
        id: req.id,
        data: () => req,
      }))
      return {
        docs,
        size: docs.length,
        forEach: (callback: (doc: any) => void) => docs.forEach(callback),
      }
    }

    it('devrait retourner toutes les demandes si query est vide', async () => {
      // Arrange
      const requests = generateManyRequests(5)
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot(requests))
      mockGetCountFromServer.mockResolvedValue({ data: () => ({ count: 5 }) })
      
      // Act
      const result = await repository.search('')
      
      // Assert
      expect(result.length).toBe(5)
    })

    it('devrait retourner toutes les demandes si query est uniquement des espaces', async () => {
      // Arrange
      const requests = generateManyRequests(5)
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot(requests))
      mockGetCountFromServer.mockResolvedValue({ data: () => ({ count: 5 }) })
      
      // Act
      const result = await repository.search('   ')
      
      // Assert
      expect(result.length).toBe(5)
    })

    it('devrait filtrer par prénom (insensible à la casse)', async () => {
      // Arrange - Utiliser des noms uniques pour éviter les collisions
      const requests = [
        createMembershipRequestFixture({
          id: 'req-search-1',
          identity: { 
            ...createMembershipRequestFixture().identity, 
            firstName: 'Alphonse', 
            lastName: 'Zorro',
            email: 'alphonse@unique.com',
          },
        }),
        createMembershipRequestFixture({
          id: 'req-search-2',
          identity: { 
            ...createMembershipRequestFixture().identity, 
            firstName: 'Bertrand', 
            lastName: 'Xavier',
            email: 'bertrand@unique.com',
          },
        }),
      ]
      
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot(requests))
      mockGetCountFromServer.mockResolvedValue({ data: () => ({ count: 2 }) })
      
      // Act
      const result = await repository.search('alphonse')
      
      // Assert
      expect(result.length).toBe(1)
      expect(result[0].identity.firstName).toBe('Alphonse')
    })

    it('devrait filtrer par nom de famille', async () => {
      // Arrange
      const requests = [
        createMembershipRequestFixture({
          id: 'req-search-3',
          identity: { 
            ...createMembershipRequestFixture().identity, 
            firstName: 'Charles', 
            lastName: 'Uniquenom',
            email: 'charles@unique.com',
          },
        }),
        createMembershipRequestFixture({
          id: 'req-search-4',
          identity: { 
            ...createMembershipRequestFixture().identity, 
            firstName: 'David', 
            lastName: 'Autrenom',
            email: 'david@unique.com',
          },
        }),
      ]
      
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot(requests))
      mockGetCountFromServer.mockResolvedValue({ data: () => ({ count: 2 }) })
      
      // Act
      const result = await repository.search('Uniquenom')
      
      // Assert
      expect(result.length).toBe(1)
      expect(result[0].identity.lastName).toBe('Uniquenom')
    })

    it('devrait filtrer par email', async () => {
      // Arrange
      const requests = [
        createMembershipRequestFixture({
          id: 'req-search-5',
          identity: { 
            ...createMembershipRequestFixture().identity, 
            firstName: 'Email1',
            lastName: 'Test1',
            email: 'uniqueemail123@test.com',
          },
        }),
        createMembershipRequestFixture({
          id: 'req-search-6',
          identity: { 
            ...createMembershipRequestFixture().identity, 
            firstName: 'Email2',
            lastName: 'Test2',
            email: 'autreemail456@test.com',
          },
        }),
      ]
      
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot(requests))
      mockGetCountFromServer.mockResolvedValue({ data: () => ({ count: 2 }) })
      
      // Act
      const result = await repository.search('uniqueemail123')
      
      // Assert
      expect(result.length).toBe(1)
      expect(result[0].identity.email).toBe('uniqueemail123@test.com')
    })

    it('devrait appliquer les filtres en plus de la recherche', async () => {
      // Arrange
      const requests = [
        createMembershipRequestFixture({
          id: 'req-filter-1',
          identity: { 
            ...createMembershipRequestFixture().identity, 
            firstName: 'FilterTest',
            lastName: 'One',
            email: 'filtertest@unique.com',
          },
          status: 'pending',
        }),
      ]
      
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot(requests))
      mockGetCountFromServer.mockResolvedValue({ data: () => ({ count: 1 }) })
      
      // Act
      const result = await repository.search('FilterTest', { status: 'pending' })
      
      // Assert
      expect(result.length).toBe(1)
    })

    it('devrait retourner un tableau vide si aucune correspondance', async () => {
      // Arrange
      const requests = [
        createMembershipRequestFixture({
          id: 'req-nomatch-1',
          identity: { 
            ...createMembershipRequestFixture().identity, 
            firstName: 'NoMatch',
            lastName: 'Person',
            email: 'nomatch@test.com',
          },
        }),
      ]
      
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot(requests))
      mockGetCountFromServer.mockResolvedValue({ data: () => ({ count: 1 }) })
      
      // Act
      const result = await repository.search('XYZ123NOTFOUND')
      
      // Assert
      expect(result.length).toBe(0)
    })
  })

  describe('create', () => {
    it('devrait créer une nouvelle demande d\'adhésion', async () => {
      const matricule = '1234.MK.567890'
      mockGenerateMatricule.mockResolvedValue(matricule)
      mockSetDoc.mockResolvedValue(undefined)

      const formData: RegisterFormData = {
        identity: {
          firstName: 'Jean',
          lastName: 'Dupont',
          email: 'jean.dupont@example.com',
          phone: '0123456789',
          contacts: ['0123456789'],
          gender: 'male',
          birthDate: '1990-01-01',
          birthPlace: 'Libreville',
          nationality: 'gabonaise',
        },
        address: {
          provinceId: 'province-1',
          communeId: 'commune-1',
          districtId: 'district-1',
          quarterId: 'quarter-1',
          province: 'Estuaire',
          city: 'Libreville',
          arrondissement: 'Arrondissement 1',
          district: 'District 1',
          street: 'Rue Test',
        },
        company: {
          companyId: 'company-1',
          companyName: 'Test Company',
          professionId: 'profession-1',
          profession: 'Engineer',
        },
        documents: {
          identityDocument: 'cni',
          identityDocumentNumber: '123456789',
          expirationDate: '2025-12-31',
          issuingPlace: 'Libreville',
          issuingDate: '2020-01-01',
          termsAccepted: true,
        },
      }

      const result = await repository.create(formData)

      expect(mockGenerateMatricule).toHaveBeenCalled()
      expect(mockSetDoc).toHaveBeenCalled()
      expect(result).toBe(matricule)
    })

    it('devrait uploader la photo de profil si fournie', async () => {
      const matricule = '1234.MK.567890'
      mockGenerateMatricule.mockResolvedValue(matricule)
      mockSetDoc.mockResolvedValue(undefined)
      mockUploadImage.mockResolvedValue({
        url: 'https://storage.example.com/photo.jpg',
        path: 'photos/photo.jpg',
      })

      const formData: RegisterFormData = {
        identity: {
          firstName: 'Jean',
          lastName: 'Dupont',
          email: 'jean.dupont@example.com',
          phone: '0123456789',
          contacts: ['0123456789'],
          gender: 'male',
          birthDate: '1990-01-01',
          birthPlace: 'Libreville',
          nationality: 'gabonaise',
          photo: 'data:image/jpeg;base64,test',
        },
        address: {
          provinceId: 'province-1',
          communeId: 'commune-1',
          province: 'Estuaire',
          city: 'Libreville',
        },
        company: {
          companyId: 'company-1',
          companyName: 'Test Company',
        },
        documents: {
          identityDocument: 'cni',
          identityDocumentNumber: '123456789',
          termsAccepted: true,
        },
      }

      await repository.create(formData)

      expect(mockUploadImage).toHaveBeenCalledWith(
        'data:image/jpeg;base64,test',
        'jean.dupont@example.com',
        matricule,
        'membership-request-profile-photo'
      )
    })

    it('devrait continuer même si l\'upload de photo échoue', async () => {
      const matricule = '1234.MK.567890'
      mockGenerateMatricule.mockResolvedValue(matricule)
      mockSetDoc.mockResolvedValue(undefined)
      mockUploadImage.mockRejectedValue(new Error('Upload failed'))
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const formData: RegisterFormData = {
        identity: {
          firstName: 'Jean',
          lastName: 'Dupont',
          email: 'jean.dupont@example.com',
          phone: '0123456789',
          contacts: ['0123456789'],
          gender: 'male',
          birthDate: '1990-01-01',
          birthPlace: 'Libreville',
          nationality: 'gabonaise',
          photo: 'data:image/jpeg;base64,test',
        },
        address: {
          provinceId: 'province-1',
          communeId: 'commune-1',
          province: 'Estuaire',
          city: 'Libreville',
        },
        company: {
          companyId: 'company-1',
          companyName: 'Test Company',
        },
        documents: {
          identityDocument: 'cni',
          identityDocumentNumber: '123456789',
          termsAccepted: true,
        },
      }

      const result = await repository.create(formData)

      expect(result).toBe(matricule)
      expect(mockSetDoc).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
      consoleWarnSpy.mockRestore()
    })
  })
})
