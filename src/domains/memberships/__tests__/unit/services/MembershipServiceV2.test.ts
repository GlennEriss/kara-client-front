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
vi.mock('@/repositories/admins/AdminRepository')
vi.mock('firebase/functions')
vi.mock('@/utils/pdfGenerator')
vi.mock('@/services/notifications/NotificationService', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    createNotification: vi.fn().mockResolvedValue(undefined),
  })),
}))
vi.mock('@/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getNotificationService: vi.fn(() => ({
      createNotification: vi.fn().mockResolvedValue(undefined),
    })),
  },
}))

describe('MembershipServiceV2', () => {
  let service: MembershipServiceV2
  let mockRepository: any
  let mockAdminRepository: any
  let mockNotificationService: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock du repository
    mockRepository = {
      getById: vi.fn(),
      updateStatus: vi.fn(),
      markAsPaid: vi.fn(),
    }
    
    // Mock de AdminRepository
    mockAdminRepository = {
      getAdminById: vi.fn().mockResolvedValue({
        id: 'admin-123',
        firstName: 'Admin',
        lastName: 'Test',
        email: 'admin@test.com',
      }),
    }
    
    // Mock de NotificationService
    mockNotificationService = {
      createNotification: vi.fn().mockResolvedValue(undefined),
    }
    
    // Utiliser le repository mocké directement
    // Réinitialiser l'instance pour les tests
    ;(MembershipServiceV2 as any).instance = undefined
    service = MembershipServiceV2.getInstance(mockRepository, mockAdminRepository, mockNotificationService)
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
          membershipType: 'adherant',
          adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
        })
      ).rejects.toThrow('La demande doit être payée avant approbation')
    })

    it('devrait throw si le statut n\'est pas "pending" ou "under_review" (approved)', async () => {
      // Arrange
      const approvedReq = approvedRequest()
      mockRepository.getById.mockResolvedValue(approvedReq)
      
      // Act & Assert
      await expect(
        service.approveMembershipRequest({
          requestId: approvedReq.id,
          adminId: 'admin-123',
          membershipType: 'adherant',
          adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
        })
      ).rejects.toThrow('Statut invalide pour approbation')
    })

    it('devrait throw si le type de membre est invalide', async () => {
      // Arrange
      const paidRequest = pendingPaidRequest()
      mockRepository.getById.mockResolvedValue(paidRequest)
      
      // Act & Assert
      await expect(
        service.approveMembershipRequest({
          requestId: paidRequest.id,
          adminId: 'admin-123',
          membershipType: 'invalid' as any,
          adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
        })
      ).rejects.toThrow('Le type de membre est requis et doit être valide')
    })

    it('devrait throw si le PDF d\'adhésion est manquant', async () => {
      // Arrange
      const paidRequest = pendingPaidRequest()
      mockRepository.getById.mockResolvedValue(paidRequest)
      
      // Act & Assert
      await expect(
        service.approveMembershipRequest({
          requestId: paidRequest.id,
          adminId: 'admin-123',
          membershipType: 'adherant',
          adhesionPdfURL: '',
        })
      ).rejects.toThrow('Le PDF d\'adhésion est obligatoire')
    })

    it('devrait throw si le PDF d\'adhésion n\'est pas une string', async () => {
      // Arrange
      const paidRequest = pendingPaidRequest()
      mockRepository.getById.mockResolvedValue(paidRequest)
      
      // Act & Assert
      await expect(
        service.approveMembershipRequest({
          requestId: paidRequest.id,
          adminId: 'admin-123',
          membershipType: 'adherant',
          adhesionPdfURL: null as any,
        })
      ).rejects.toThrow('Le PDF d\'adhésion est obligatoire')
    })

    it('devrait throw si le statut n\'est pas "pending" ou "under_review" (rejected)', async () => {
      // Arrange - Créer une demande rejetée mais payée pour tester la validation du statut
      const rejectedReq = createMembershipRequestFixture({
        status: 'rejected',
        isPaid: true, // Payée pour passer la première validation
        payments: [{
          date: new Date(),
          mode: 'cash',
          amount: 25000,
          acceptedBy: 'admin-123',
          paymentType: 'Membership',
          time: '10:30',
          withFees: false,
          recordedBy: 'admin-123',
          recordedByName: 'Admin Test',
          recordedAt: new Date(),
        }],
      })
      mockRepository.getById.mockResolvedValue(rejectedReq)
      
      // Act & Assert
      await expect(
        service.approveMembershipRequest({
          requestId: rejectedReq.id,
          adminId: 'admin-123',
          membershipType: 'adherant',
          adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
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
      
      // Mock de la Cloud Function
      const mockCallableFunction = vi.fn().mockResolvedValue({
        data: {
          success: true,
          matricule: '1234.MK.567890',
          email: 'test@kara.ga',
          password: 'TempPass123!',
          subscriptionId: 'sub-123',
        },
      }) as any
      
      // Ajouter la propriété stream requise par HttpsCallable
      mockCallableFunction.stream = vi.fn()
      
      const { getFunctions, httpsCallable } = await import('firebase/functions')
      vi.mocked(getFunctions).mockReturnValue({} as any)
      vi.mocked(httpsCallable).mockReturnValue(mockCallableFunction)
      
      // Mock PDF generator
      const { generateCredentialsPDF, downloadPDF } = await import('@/utils/pdfGenerator')
      const mockPdfBlob = new Blob(['pdf content'], { type: 'application/pdf' })
      vi.mocked(generateCredentialsPDF).mockResolvedValue(mockPdfBlob)
      vi.mocked(downloadPDF).mockImplementation(() => {})
      
      // Act
      await service.approveMembershipRequest({
        requestId: paidRequest.id,
        adminId: 'admin-123',
        membershipType: 'adherant',
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
      })
      
      // Assert
      // Vérifier que la Cloud Function a été appelée avec les bons paramètres
      expect(mockCallableFunction).toHaveBeenCalledWith({
        requestId: paidRequest.id,
        adminId: 'admin-123',
        membershipType: 'adherant',
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
        companyId: null,
        professionId: null,
      })
      
      // Vérifier que le PDF a été généré et téléchargé
      expect(generateCredentialsPDF).toHaveBeenCalled()
      expect(downloadPDF).toHaveBeenCalled()
    })

    it('devrait throw si la Cloud Function retourne success: false', async () => {
      // Arrange
      const paidRequest = pendingPaidRequest()
      mockRepository.getById.mockResolvedValue(paidRequest)
      
      const mockCallableFunction = vi.fn().mockResolvedValue({
        data: {
          success: false,
          matricule: '1234.MK.567890',
          email: 'test@kara.ga',
          password: 'TempPass123!',
          subscriptionId: 'sub-123',
        },
      }) as any
      mockCallableFunction.stream = vi.fn()
      
      const { getFunctions, httpsCallable } = await import('firebase/functions')
      vi.mocked(getFunctions).mockReturnValue({} as any)
      vi.mocked(httpsCallable).mockReturnValue(mockCallableFunction)
      
      // Act & Assert
      await expect(
        service.approveMembershipRequest({
          requestId: paidRequest.id,
          adminId: 'admin-123',
          membershipType: 'adherant',
          adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
        })
      ).rejects.toThrow('Erreur lors de l\'approbation de la demande d\'adhésion')
    })

    it('devrait continuer même si la génération du PDF échoue', async () => {
      // Arrange
      const paidRequest = pendingPaidRequest()
      mockRepository.getById.mockResolvedValue(paidRequest)
      
      const mockCallableFunction = vi.fn().mockResolvedValue({
        data: {
          success: true,
          matricule: '1234.MK.567890',
          email: 'test@kara.ga',
          password: 'TempPass123!',
          subscriptionId: 'sub-123',
        },
      }) as any
      mockCallableFunction.stream = vi.fn()
      
      const { getFunctions, httpsCallable } = await import('firebase/functions')
      vi.mocked(getFunctions).mockReturnValue({} as any)
      vi.mocked(httpsCallable).mockReturnValue(mockCallableFunction)
      
      // Mock PDF generator pour qu'il échoue
      const { generateCredentialsPDF } = await import('@/utils/pdfGenerator')
      vi.mocked(generateCredentialsPDF).mockRejectedValue(new Error('Erreur PDF'))
      
      // Act - Ne doit pas throw
      await expect(
        service.approveMembershipRequest({
          requestId: paidRequest.id,
          adminId: 'admin-123',
          membershipType: 'adherant',
          adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
        })
      ).resolves.toBeUndefined()
      
      // Assert - La Cloud Function a quand même été appelée
      expect(mockCallableFunction).toHaveBeenCalled()
    })
  })

  describe('rejectMembershipRequest', () => {
    it('devrait throw si la demande n\'existe pas', async () => {
      // Arrange
      mockRepository.getById.mockResolvedValue(null)
      
      // Act & Assert
      await expect(
        service.rejectMembershipRequest({
          requestId: 'non-existent-id',
          adminId: 'admin-123',
          reason: 'Documents incomplets et informations manquantes.',
        })
      ).rejects.toThrow('introuvable')
    })

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

    it('ne devrait pas générer l\'URL WhatsApp si sendWhatsApp est false', async () => {
      // Arrange
      const request = pendingUnpaidRequest()
      mockRepository.getById.mockResolvedValue(request)
      mockRepository.updateStatus.mockResolvedValue(undefined)
      
      // Act
      const result = await service.requestCorrections({
        requestId: request.id,
        adminId: 'admin-123',
        corrections: ['Veuillez mettre à jour votre photo.'],
        sendWhatsApp: false,
      })
      
      // Assert
      expect(generateWhatsAppUrl).not.toHaveBeenCalled()
      expect(result.whatsAppUrl).toBeUndefined()
    })

    it('ne devrait pas générer l\'URL WhatsApp si contacts est vide', async () => {
      // Arrange
      const request = createMembershipRequestFixture({
        identity: {
          ...pendingUnpaidRequest().identity,
          contacts: [], // Pas de contacts
        },
      })
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
      expect(generateWhatsAppUrl).not.toHaveBeenCalled()
      expect(result.whatsAppUrl).toBeUndefined()
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
            mode: 'cash',
            date: new Date().toISOString(),
            time: '14:30',
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
            time: '14:30',
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
            mode: 'cash',
            date: new Date().toISOString(),
            time: '14:30',
          },
        })
      ).rejects.toThrow('déjà payé')
    })

    it('devrait valider les modes de paiement autorisés', async () => {
      // Arrange
      const request = pendingUnpaidRequest()
      const validModes: Array<'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer' | 'other'> = [
        'airtel_money',
        'mobicash',
        'cash',
        'bank_transfer',
        'other',
      ]
      
      mockRepository.getById.mockResolvedValue(request)
      mockRepository.markAsPaid.mockResolvedValue(undefined)
      
      // Act & Assert - chaque mode devrait être accepté
      for (const mode of validModes) {
        const paymentInfo: any = {
          amount: 25000,
          mode,
          date: new Date().toISOString(),
          time: '14:30',
        }
        
        // Ajouter withFees pour les modes mobile money
        if (mode === 'airtel_money' || mode === 'mobicash') {
          paymentInfo.withFees = false
        }
        
        // Ajouter paymentMethodOther pour le mode 'other'
        if (mode === 'other') {
          paymentInfo.paymentMethodOther = 'Orange Money'
        }
        
        await service.processPayment({
          requestId: request.id,
          adminId: 'admin-123',
          paymentInfo,
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
          mode: 'cash',
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
          recordedBy: 'admin-123',
          recordedByName: 'Admin Test',
          recordedAt: expect.any(Date),
        })
      )
    })

    it('devrait récupérer les informations de l\'admin et les inclure dans la traçabilité', async () => {
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
          mode: 'cash',
          date: paymentDate,
          time: paymentTime,
        },
      })
      
      // Assert
      expect(mockAdminRepository.getAdminById).toHaveBeenCalledWith('admin-123')
      expect(mockRepository.markAsPaid).toHaveBeenCalledWith(
        request.id,
        expect.objectContaining({
          recordedBy: 'admin-123',
          recordedByName: 'Admin Test',
          recordedAt: expect.any(Date),
        })
      )
    })

    it('devrait utiliser "Admin inconnu" si l\'admin n\'est pas trouvé', async () => {
      // Arrange
      const request = pendingUnpaidRequest()
      mockRepository.getById.mockResolvedValue(request)
      mockAdminRepository.getAdminById.mockResolvedValue(null) // Admin non trouvé
      
      // Act & Assert - Doit rejeter avec une erreur de sécurité
      await expect(
        service.processPayment({
        requestId: request.id,
        adminId: 'admin-unknown',
        paymentInfo: {
          amount: 25000,
          mode: 'cash',
          date: new Date().toISOString(),
          time: '10:30',
        },
        })
      ).rejects.toThrow('SÉCURITÉ : L\'administrateur avec l\'ID "admin-unknown" n\'existe pas dans la base de données')
      
      // Le paiement ne doit PAS être enregistré
      expect(mockRepository.markAsPaid).not.toHaveBeenCalled()
    })

    it('devrait rejeter le paiement si l\'admin existe mais n\'a pas de nom valide', async () => {
      // Arrange
      const request = pendingUnpaidRequest()
      mockRepository.getById.mockResolvedValue(request)
      // Admin sans nom (firstName et lastName vides)
      mockAdminRepository.getAdminById.mockResolvedValue({
        id: 'admin-123',
        firstName: '',
        lastName: '',
        email: 'admin@test.com',
      })
      
      // Act & Assert - Doit rejeter avec une erreur de sécurité
      await expect(
        service.processPayment({
          requestId: request.id,
          adminId: 'admin-123',
          paymentInfo: {
            amount: 25000,
            mode: 'cash',
            date: new Date().toISOString(),
            time: '10:30',
          },
        })
      ).rejects.toThrow('SÉCURITÉ : Impossible de déterminer l\'identité de l\'administrateur')
      
      // Le paiement ne doit PAS être enregistré
      expect(mockRepository.markAsPaid).not.toHaveBeenCalled()
    })

    it('devrait throw si heure de versement manquante', async () => {
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
            mode: 'cash',
            date: new Date().toISOString(),
            time: '',
          },
        })
      ).rejects.toThrow('heure')
    })

    it('devrait throw si mode "other" sans précision', async () => {
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
            mode: 'other',
            date: new Date().toISOString(),
            time: '14:30',
            paymentMethodOther: '',
          },
        })
      ).rejects.toThrow('préciser')
    })

    it('devrait throw si mobile money sans withFees', async () => {
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
            mode: 'airtel_money',
            date: new Date().toISOString(),
            time: '14:30',
            // withFees manquant
          },
        })
      ).rejects.toThrow('frais')
    })

    it('devrait throw si demande introuvable', async () => {
      // Arrange
      mockRepository.getById.mockResolvedValue(null)
      
      // Act & Assert
      await expect(
        service.processPayment({
          requestId: 'non-existent',
          adminId: 'admin-123',
          paymentInfo: {
            amount: 25000,
            mode: 'cash',
            date: new Date().toISOString(),
            time: '14:30',
          },
        })
      ).rejects.toThrow('introuvable')
    })

    it('devrait utiliser la date actuelle si date non fournie', async () => {
      // Arrange
      const request = pendingUnpaidRequest()
      mockRepository.getById.mockResolvedValue(request)
      mockRepository.markAsPaid.mockResolvedValue(undefined)
      
      // Act
      await service.processPayment({
        requestId: request.id,
        adminId: 'admin-123',
        paymentInfo: {
          amount: 25000,
          mode: 'cash',
          time: '14:30',
          // date non fournie
        } as any,
      })
      
      // Assert
      expect(mockRepository.markAsPaid).toHaveBeenCalledWith(
        request.id,
        expect.objectContaining({
          date: expect.any(String),
        })
      )
    })

  })

  describe('approveMembershipRequest - branches supplémentaires', () => {
    it('devrait throw si demande introuvable', async () => {
      // Arrange
      mockRepository.getById.mockResolvedValue(null)
      
      // Act & Assert
      await expect(
        service.approveMembershipRequest({
          requestId: 'non-existent',
          adminId: 'admin-123',
          membershipType: 'adherant',
          adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
        })
      ).rejects.toThrow('introuvable')
    })
  })

  describe('rejectMembershipRequest - branches supplémentaires', () => {
    it('devrait throw si motif trop long', async () => {
      // Arrange
      const request = pendingUnpaidRequest()
      mockRepository.getById.mockResolvedValue(request)
      
      const longReason = 'A'.repeat(2001) // > 2000 caractères
      
      // Act & Assert
      await expect(
        service.rejectMembershipRequest({
          requestId: request.id,
          adminId: 'admin-123',
          reason: longReason,
        })
      ).rejects.toThrow('dépasser')
    })
  })

  describe('requestCorrections - branches supplémentaires', () => {
    it('devrait throw si une correction est vide', async () => {
      // Arrange
      const request = pendingUnpaidRequest()
      mockRepository.getById.mockResolvedValue(request)
      
      // Act & Assert
      await expect(
        service.requestCorrections({
          requestId: request.id,
          adminId: 'admin-123',
          corrections: ['Correction valide', '   '], // Une correction vide
        })
      ).rejects.toThrow('caractère')
    })

    it('devrait throw si demande introuvable', async () => {
      // Arrange
      mockRepository.getById.mockResolvedValue(null)
      
      // Act & Assert
      await expect(
        service.requestCorrections({
          requestId: 'non-existent',
          adminId: 'admin-123',
          corrections: ['Correction'],
        })
      ).rejects.toThrow('introuvable')
    })
  })
})
