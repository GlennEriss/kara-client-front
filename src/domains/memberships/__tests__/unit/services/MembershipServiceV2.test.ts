/**
 * Tests unitaires pour MembershipServiceV2
 * 
 * Approche TDD : Tests écrits AVANT l'implémentation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MembershipServiceV2 } from '../../../services/MembershipServiceV2'
import { MembershipRepositoryV2 } from '../../../repositories/MembershipRepositoryV2'
import { 
  pendingPaidRequest,
  pendingUnpaidRequest,
  approvedRequest,
  rejectedRequest,
  createMembershipRequestFixture,
} from '../../fixtures'
import { generateSecurityCode, calculateCodeExpiry } from '../../../utils/securityCode'
import { generateWhatsAppUrl } from '../../../utils/whatsappUrl'

// Mock des dépendances
vi.mock('../../../repositories/MembershipRepositoryV2')
vi.mock('../../../utils/securityCode')
vi.mock('../../../utils/whatsappUrl')
vi.mock('@/firebase/adminAuth')
vi.mock('@/db/user.db')
vi.mock('@/db/subscription.db')

describe('MembershipServiceV2', () => {
  let service: MembershipServiceV2
  let mockRepository: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock du repository
    mockRepository = {
      getById: vi.fn(),
      updateStatus: vi.fn(),
      markAsPaid: vi.fn(),
    }
    
    // Utiliser le repository mocké directement
    service = MembershipServiceV2.getInstance(mockRepository)
    
    // Réinitialiser l'instance pour les tests
    ;(MembershipServiceV2 as any).instance = undefined
    service = MembershipServiceV2.getInstance(mockRepository)
  })

  describe('approveMembershipRequest', () => {
    // ==================== PRÉREQUIS ====================
    
    it('devrait throw si la demande n\'est pas payée', async () => {
      // Arrange
      const unpaidRequest = pendingUnpaidRequest()
      mockRepository.getById.mockResolvedValue(unpaidRequest)
      
      // Act & Assert
      await expect(
        service.approveMembershipRequest({
          requestId: unpaidRequest.id,
          adminId: 'admin-123',
        })
      ).rejects.toThrow('La demande doit être payée avant approbation')
    })

    it('devrait throw si le statut n\'est pas "pending" ou "under_review"', async () => {
      // Arrange
      const approvedReq = approvedRequest()
      mockRepository.getById.mockResolvedValue(approvedReq)
      
      // Act & Assert
      await expect(
        service.approveMembershipRequest({
          requestId: approvedReq.id,
          adminId: 'admin-123',
        })
      ).rejects.toThrow('Statut invalide pour approbation')
    })

    // ==================== FLUX PRINCIPAL ====================
    // Note: Les tests du flux principal nécessiteraient des mocks complexes
    // (Firebase Admin Auth, création de user, abonnement, etc.)
    // Pour l'instant, on se concentre sur les validations et la structure
    
    it('devrait mettre à jour le statut de la demande en "approved"', async () => {
      // Arrange
      const paidRequest = pendingPaidRequest()
      mockRepository.getById.mockResolvedValue(paidRequest)
      mockRepository.updateStatus.mockResolvedValue(undefined)
      
      // Act
      await service.approveMembershipRequest({
        requestId: paidRequest.id,
        adminId: 'admin-123',
      })
      
      // Assert
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        paidRequest.id,
        'approved',
        expect.objectContaining({
          processedBy: 'admin-123',
          processedAt: expect.any(Date),
        })
      )
    })
  })

  describe('rejectMembershipRequest', () => {
    it('devrait throw si pas de motif de rejet', async () => {
      // Arrange
      const request = pendingUnpaidRequest()
      mockRepository.getById.mockResolvedValue(request)
      
      // Act & Assert
      await expect(
        service.rejectMembershipRequest({
          requestId: request.id,
          adminId: 'admin-123',
          reason: '',
        })
      ).rejects.toThrow()
    })

    it('devrait throw si motif trop court (< 10 caractères)', async () => {
      // Arrange
      const request = pendingUnpaidRequest()
      mockRepository.getById.mockResolvedValue(request)
      
      // Act & Assert
      await expect(
        service.rejectMembershipRequest({
          requestId: request.id,
          adminId: 'admin-123',
          reason: 'Court',
        })
      ).rejects.toThrow()
    })

    it('devrait mettre à jour le statut en "rejected"', async () => {
      // Arrange
      const request = pendingUnpaidRequest()
      const reason = 'Documents incomplets et informations manquantes.'
      mockRepository.getById.mockResolvedValue(request)
      mockRepository.updateStatus.mockResolvedValue(undefined)
      
      // Act
      await service.rejectMembershipRequest({
        requestId: request.id,
        adminId: 'admin-123',
        reason,
      })
      
      // Assert
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        request.id,
        'rejected',
        expect.objectContaining({
          motifReject: reason,
          processedBy: 'admin-123',
          processedAt: expect.any(Date),
        })
      )
    })
  })

  describe('requestCorrections', () => {
    it('devrait throw si pas de liste de corrections', async () => {
      // Arrange
      const request = pendingUnpaidRequest()
      mockRepository.getById.mockResolvedValue(request)
      
      // Act & Assert
      await expect(
        service.requestCorrections({
          requestId: request.id,
          adminId: 'admin-123',
          corrections: [],
        })
      ).rejects.toThrow()
    })

    it('devrait générer un code de sécurité à 6 chiffres', async () => {
      // Arrange
      const request = pendingUnpaidRequest()
      const mockCode = '123456'
      vi.mocked(generateSecurityCode).mockReturnValue(mockCode)
      
      mockRepository.getById.mockResolvedValue(request)
      mockRepository.updateStatus.mockResolvedValue(undefined)
      
      // Act
      await service.requestCorrections({
        requestId: request.id,
        adminId: 'admin-123',
        corrections: ['Veuillez mettre à jour votre photo.'],
      })
      
      // Assert
      expect(generateSecurityCode).toHaveBeenCalled()
    })

    it('devrait définir une expiration de 48h pour le code', async () => {
      // Arrange
      const request = pendingUnpaidRequest()
      const mockCode = '123456'
      const mockExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000)
      
      vi.mocked(generateSecurityCode).mockReturnValue(mockCode)
      vi.mocked(calculateCodeExpiry).mockReturnValue(mockExpiry)
      
      mockRepository.getById.mockResolvedValue(request)
      mockRepository.updateStatus.mockResolvedValue(undefined)
      
      // Act
      await service.requestCorrections({
        requestId: request.id,
        adminId: 'admin-123',
        corrections: ['Veuillez mettre à jour votre photo.'],
      })
      
      // Assert
      expect(calculateCodeExpiry).toHaveBeenCalledWith(48)
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        request.id,
        'under_review',
        expect.objectContaining({
          securityCode: mockCode,
          securityCodeExpiry: mockExpiry,
          securityCodeUsed: false,
        })
      )
    })

    it('devrait mettre à jour le statut en "under_review"', async () => {
      // Arrange
      const request = pendingUnpaidRequest()
      const corrections = ['Veuillez mettre à jour votre photo.']
      
      mockRepository.getById.mockResolvedValue(request)
      mockRepository.updateStatus.mockResolvedValue(undefined)
      
      // Act
      await service.requestCorrections({
        requestId: request.id,
        adminId: 'admin-123',
        corrections,
      })
      
      // Assert
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        request.id,
        'under_review',
        expect.any(Object)
      )
    })

    it('devrait générer l\'URL WhatsApp correctement', async () => {
      // Arrange
      const request = pendingUnpaidRequest()
      const mockUrl = 'https://wa.me/24165671734?text=Bonjour'
      
      vi.mocked(generateWhatsAppUrl).mockReturnValue(mockUrl)
      mockRepository.getById.mockResolvedValue(request)
      mockRepository.updateStatus.mockResolvedValue(undefined)
      
      // Act
      const result = await service.requestCorrections({
        requestId: request.id,
        adminId: 'admin-123',
        corrections: ['Veuillez mettre à jour votre photo.'],
        sendWhatsApp: true,
      })
      
      // Assert
      expect(result.whatsAppUrl).toBe(mockUrl)
      if (request.identity.contacts && request.identity.contacts[0]) {
        expect(generateWhatsAppUrl).toHaveBeenCalledWith(
          request.identity.contacts[0],
          expect.stringContaining('correction')
        )
      }
    })
  })

  describe('processPayment', () => {
    it('devrait throw si montant <= 0', async () => {
      // Arrange
      const request = pendingUnpaidRequest()
      mockRepository.getById.mockResolvedValue(request)
      
      // Act & Assert
      await expect(
        service.processPayment({
          requestId: request.id,
          adminId: 'admin-123',
          paymentInfo: {
            amount: 0,
            mode: 'Cash',
            date: new Date().toISOString(),
          },
        })
      ).rejects.toThrow()
    })

    it('devrait throw si mode de paiement invalide', async () => {
      // Arrange
      const request = pendingUnpaidRequest()
      mockRepository.getById.mockResolvedValue(request)
      
      // Act & Assert
      await expect(
        service.processPayment({
          requestId: request.id,
          adminId: 'admin-123',
          paymentInfo: {
            amount: 25000,
            mode: 'InvalidMode' as any,
            date: new Date().toISOString(),
          },
        })
      ).rejects.toThrow()
    })

    it('devrait throw si déjà payé', async () => {
      // Arrange
      const paidRequest = pendingPaidRequest()
      mockRepository.getById.mockResolvedValue(paidRequest)
      
      // Act & Assert
      await expect(
        service.processPayment({
          requestId: paidRequest.id,
          adminId: 'admin-123',
          paymentInfo: {
            amount: 25000,
            mode: 'Cash',
            date: new Date().toISOString(),
          },
        })
      ).rejects.toThrow('déjà payé')
    })

    it('devrait valider les modes de paiement autorisés', async () => {
      // Arrange
      const request = pendingUnpaidRequest()
      const validModes: Array<'AirtelMoney' | 'Mobicash' | 'Cash' | 'Virement' | 'Chèque'> = [
        'AirtelMoney',
        'Mobicash',
        'Cash',
        'Virement',
        'Chèque',
      ]
      
      mockRepository.getById.mockResolvedValue(request)
      mockRepository.markAsPaid.mockResolvedValue(undefined)
      
      // Act & Assert - chaque mode devrait être accepté
      for (const mode of validModes) {
        await service.processPayment({
          requestId: request.id,
          adminId: 'admin-123',
          paymentInfo: {
            amount: 25000,
            mode,
            date: new Date().toISOString(),
          },
        })
      }
      
      expect(mockRepository.markAsPaid).toHaveBeenCalledTimes(validModes.length)
    })

    it('devrait enregistrer la date et l\'heure de paiement', async () => {
      // Arrange
      const request = pendingUnpaidRequest()
      const paymentDate = new Date().toISOString()
      const paymentTime = '10:30'
      
      mockRepository.getById.mockResolvedValue(request)
      mockRepository.markAsPaid.mockResolvedValue(undefined)
      
      // Act
      await service.processPayment({
        requestId: request.id,
        adminId: 'admin-123',
        paymentInfo: {
          amount: 25000,
          mode: 'Cash',
          date: paymentDate,
          time: paymentTime,
        },
      })
      
      // Assert
      expect(mockRepository.markAsPaid).toHaveBeenCalledWith(
        request.id,
        expect.objectContaining({
          date: paymentDate,
          time: paymentTime,
        })
      )
    })
  })
})
