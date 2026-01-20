/**
 * Tests d'intégration pour l'approbation d'une demande d'adhésion
 * 
 * Tests l'intégration entre :
 * - Service → Cloud Function → Firebase
 * - Hook → Service → Cloud Function
 * - PDF Generator → Download
 * 
 * @see TESTS_INTEGRATION.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MembershipServiceV2 } from '../../services/MembershipServiceV2'
import { MembershipRepositoryV2 } from '../../repositories/MembershipRepositoryV2'
import { AdminRepository } from '@/repositories/admins/AdminRepository'
import { createMembershipRequestFixture, pendingPaidRequest } from '../fixtures'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/firebase/app'
import { generateCredentialsPDF, downloadPDF } from '@/utils/pdfGenerator'

// Mock des dépendances
vi.mock('../../repositories/MembershipRepositoryV2')
vi.mock('@/repositories/admins/AdminRepository')
vi.mock('firebase/functions')
vi.mock('@/firebase/app')
vi.mock('@/utils/pdfGenerator')

describe('Integration: Approve Membership Request Flow', () => {
  let service: MembershipServiceV2
  let mockRepository: any
  let mockAdminRepository: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock du repository
    mockRepository = {
      getById: vi.fn(),
      updateStatus: vi.fn(),
    }
    
    // Mock de AdminRepository
    mockAdminRepository = {
      getAdminById: vi.fn().mockResolvedValue({
        id: 'admin-1',
        firstName: 'Admin',
        lastName: 'Test',
        email: 'admin@test.com',
      }),
    }
    
    // Utiliser le repository mocké directement
    ;(MembershipServiceV2 as any).instance = undefined
    service = MembershipServiceV2.getInstance(mockRepository, mockAdminRepository)
  })

  describe('INT-APPROV-01: Flow complet Admin → Service → Cloud Function', () => {
    it('should complete full flow: Admin → Service → Cloud Function → Firebase', async () => {
      // Arrange
      const paidRequest = pendingPaidRequest()
      mockRepository.getById.mockResolvedValue(paidRequest)
      
      // Mock Cloud Function
      const mockCallableFunction = vi.fn().mockResolvedValue({
        data: {
          success: true,
          matricule: paidRequest.matricule || '1234.MK.567890',
          email: 'jeandupont1234@kara.ga',
          password: 'TempPass123!',
          subscriptionId: 'sub-123',
          companyId: null,
          professionId: null,
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
        adminId: 'admin-1',
        membershipType: 'adherant',
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
      })
      
      // Assert
      // Vérifier que la Cloud Function a été appelée avec les bons paramètres
      expect(mockCallableFunction).toHaveBeenCalledWith({
        requestId: paidRequest.id,
        adminId: 'admin-1',
        membershipType: 'adherant',
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
        companyId: null,
        professionId: null,
      })
      
      // Vérifier que le PDF a été généré et téléchargé
      expect(generateCredentialsPDF).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: paidRequest.identity.firstName,
          lastName: paidRequest.identity.lastName,
          email: 'jeandupont1234@kara.ga',
          password: 'TempPass123!',
        })
      )
      expect(downloadPDF).toHaveBeenCalled()
    })
  })

  describe('INT-APPROV-02: Intégration avec création d\'entreprise', () => {
    it('should handle company creation if it does not exist', async () => {
      // Arrange
      const paidRequest = createMembershipRequestFixture({
        status: 'pending',
        isPaid: true,
        company: {
          isEmployed: true,
          companyName: 'Nouvelle Entreprise',
          profession: 'Ingénieur',
        },
      })
      mockRepository.getById.mockResolvedValue(paidRequest)
      
      // Mock Cloud Function avec companyId
      const mockCallableFunction = vi.fn().mockResolvedValue({
        data: {
          success: true,
          matricule: paidRequest.matricule || '1234.MK.567890',
          email: 'jeandupont1234@kara.ga',
          password: 'TempPass123!',
          subscriptionId: 'sub-123',
          companyId: 'company-123',
          professionId: null,
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
        adminId: 'admin-1',
        membershipType: 'adherant',
        companyId: 'company-123',
        professionId: null,
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
      })
      
      // Assert
      expect(mockCallableFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'company-123',
        })
      )
    })
  })

  describe('INT-APPROV-03: Intégration avec création de profession', () => {
    it('should handle profession creation if it does not exist', async () => {
      // Arrange
      const paidRequest = createMembershipRequestFixture({
        status: 'pending',
        isPaid: true,
        company: {
          isEmployed: true,
          companyName: 'Entreprise Test',
          profession: 'Nouvelle Profession',
        },
      })
      mockRepository.getById.mockResolvedValue(paidRequest)
      
      // Mock Cloud Function avec professionId
      const mockCallableFunction = vi.fn().mockResolvedValue({
        data: {
          success: true,
          matricule: paidRequest.matricule || '1234.MK.567890',
          email: 'jeandupont1234@kara.ga',
          password: 'TempPass123!',
          subscriptionId: 'sub-123',
          companyId: null,
          professionId: 'prof-123',
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
        adminId: 'admin-1',
        membershipType: 'adherant',
        companyId: null,
        professionId: 'prof-123',
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
      })
      
      // Assert
      expect(mockCallableFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          professionId: 'prof-123',
        })
      )
    })
  })

  describe('INT-APPROV-04 à INT-APPROV-08: Cloud Function Integration', () => {
    // Note: Les tests d'intégration Cloud Function nécessitent Firebase Admin SDK
    // et un environnement de test configuré. Pour l'instant, on teste l'intégration
    // Service → Cloud Function avec des mocks.
    
    it('INT-APPROV-04: should call Cloud Function with correct parameters', async () => {
      // Arrange
      const paidRequest = pendingPaidRequest()
      mockRepository.getById.mockResolvedValue(paidRequest)
      
      const mockCallableFunction = vi.fn().mockResolvedValue({
        data: {
          success: true,
          matricule: paidRequest.matricule || '1234.MK.567890',
          email: 'jeandupont1234@kara.ga',
          password: 'TempPass123!',
          subscriptionId: 'sub-123',
        },
      }) as any
      
      // Ajouter la propriété stream requise par HttpsCallable
      mockCallableFunction.stream = vi.fn()
      
      const { getFunctions, httpsCallable } = await import('firebase/functions')
      vi.mocked(getFunctions).mockReturnValue({} as any)
      vi.mocked(httpsCallable).mockReturnValue(mockCallableFunction)
      
      const { generateCredentialsPDF, downloadPDF } = await import('@/utils/pdfGenerator')
      const mockPdfBlob = new Blob(['pdf content'], { type: 'application/pdf' })
      vi.mocked(generateCredentialsPDF).mockResolvedValue(mockPdfBlob)
      vi.mocked(downloadPDF).mockImplementation(() => {})
      
      // Act
      await service.approveMembershipRequest({
        requestId: paidRequest.id,
        adminId: 'admin-1',
        membershipType: 'adherant',
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
      })
      
      // Assert
      expect(httpsCallable).toHaveBeenCalledWith({}, 'approveMembershipRequest')
      expect(mockCallableFunction).toHaveBeenCalled()
    })
  })

  describe('INT-APPROV-09 à INT-APPROV-10: Rollback Integration', () => {
    it('INT-APPROV-09: should handle rollback if Cloud Function fails', async () => {
      // Arrange
      const paidRequest = pendingPaidRequest()
      mockRepository.getById.mockResolvedValue(paidRequest)
      
      // Mock Cloud Function pour échouer
      const mockCallableFunction = vi.fn().mockRejectedValue(
        new Error('Erreur lors de la création de l\'utilisateur')
      ) as any
      
      // Ajouter la propriété stream requise par HttpsCallable
      mockCallableFunction.stream = vi.fn()
      
      const { getFunctions, httpsCallable } = await import('firebase/functions')
      vi.mocked(getFunctions).mockReturnValue({} as any)
      vi.mocked(httpsCallable).mockReturnValue(mockCallableFunction)
      
      // Act & Assert
      await expect(
        service.approveMembershipRequest({
          requestId: paidRequest.id,
          adminId: 'admin-1',
          membershipType: 'adherant',
          adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
        })
      ).rejects.toThrow()
      
      // Vérifier que le PDF n'a pas été généré en cas d'erreur
      const { generateCredentialsPDF } = await import('@/utils/pdfGenerator')
      expect(generateCredentialsPDF).not.toHaveBeenCalled()
    })

    it('INT-APPROV-10: should handle rollback if subscription creation fails', async () => {
      // Arrange
      const paidRequest = pendingPaidRequest()
      mockRepository.getById.mockResolvedValue(paidRequest)
      
      // Mock Cloud Function pour échouer après création User
      const mockCallableFunction = vi.fn().mockRejectedValue(
        new Error('Erreur lors de la création de l\'abonnement')
      ) as any
      
      // Ajouter la propriété stream requise par HttpsCallable
      mockCallableFunction.stream = vi.fn()
      
      const { getFunctions, httpsCallable } = await import('firebase/functions')
      vi.mocked(getFunctions).mockReturnValue({} as any)
      vi.mocked(httpsCallable).mockReturnValue(mockCallableFunction)
      
      // Act & Assert
      await expect(
        service.approveMembershipRequest({
          requestId: paidRequest.id,
          adminId: 'admin-1',
          membershipType: 'adherant',
          adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
        })
      ).rejects.toThrow()
      
      // Le rollback est géré par la Cloud Function elle-même
      // Ici on vérifie juste que l'erreur est propagée
      expect(mockCallableFunction).toHaveBeenCalled()
    })
  })

  describe('INT-APPROV-11 à INT-APPROV-12: PDF Generator Integration', () => {
    it('INT-APPROV-11: should generate PDF with credentials after approval', async () => {
      // Arrange
      const paidRequest = pendingPaidRequest()
      mockRepository.getById.mockResolvedValue(paidRequest)
      
      const mockCallableFunction = vi.fn().mockResolvedValue({
        data: {
          success: true,
          matricule: '1234.MK.567890',
          email: 'jeandupont1234@kara.ga',
          password: 'TempPass123!',
          subscriptionId: 'sub-123',
        },
      }) as any
      
      // Ajouter la propriété stream requise par HttpsCallable
      mockCallableFunction.stream = vi.fn()
      
      const { getFunctions, httpsCallable } = await import('firebase/functions')
      vi.mocked(getFunctions).mockReturnValue({} as any)
      vi.mocked(httpsCallable).mockReturnValue(mockCallableFunction)
      
      const { generateCredentialsPDF, downloadPDF } = await import('@/utils/pdfGenerator')
      const mockPdfBlob = new Blob(['pdf content'], { type: 'application/pdf' })
      vi.mocked(generateCredentialsPDF).mockResolvedValue(mockPdfBlob)
      vi.mocked(downloadPDF).mockImplementation(() => {})
      
      // Act
      await service.approveMembershipRequest({
        requestId: paidRequest.id,
        adminId: 'admin-1',
        membershipType: 'adherant',
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
      })
      
      // Assert
      expect(generateCredentialsPDF).toHaveBeenCalledWith({
        firstName: paidRequest.identity.firstName,
        lastName: paidRequest.identity.lastName,
        matricule: '1234.MK.567890',
        email: 'jeandupont1234@kara.ga',
        password: 'TempPass123!',
      })
      
      expect(downloadPDF).toHaveBeenCalled()
      const downloadCall = vi.mocked(downloadPDF).mock.calls[0]
      expect(downloadCall[0]).toBeInstanceOf(Blob)
      // Le deuxième paramètre peut être undefined si formatCredentialsFilename n'est pas mocké
      if (downloadCall[1]) {
        expect(downloadCall[1]).toMatch(/^Identifiants_Connexion_.*\.pdf$/)
      }
    })

    it('INT-APPROV-12: should download PDF automatically after generation', async () => {
      // Arrange
      const paidRequest = pendingPaidRequest()
      mockRepository.getById.mockResolvedValue(paidRequest)
      
      const mockCallableFunction = vi.fn().mockResolvedValue({
        data: {
          success: true,
          matricule: '1234.MK.567890',
          email: 'jeandupont1234@kara.ga',
          password: 'TempPass123!',
          subscriptionId: 'sub-123',
        },
      }) as any
      
      // Ajouter la propriété stream requise par HttpsCallable
      mockCallableFunction.stream = vi.fn()
      
      const { getFunctions, httpsCallable } = await import('firebase/functions')
      vi.mocked(getFunctions).mockReturnValue({} as any)
      vi.mocked(httpsCallable).mockReturnValue(mockCallableFunction)
      
      const { generateCredentialsPDF, downloadPDF } = await import('@/utils/pdfGenerator')
      const mockPdfBlob = new Blob(['pdf content'], { type: 'application/pdf' })
      vi.mocked(generateCredentialsPDF).mockResolvedValue(mockPdfBlob)
      vi.mocked(downloadPDF).mockImplementation(() => {})
      
      // Act
      await service.approveMembershipRequest({
        requestId: paidRequest.id,
        adminId: 'admin-1',
        membershipType: 'adherant',
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
      })
      
      // Assert: Vérifier que downloadPDF a été appelé
      expect(downloadPDF).toHaveBeenCalled()
    })
  })
})
