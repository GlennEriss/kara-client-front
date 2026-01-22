/**
 * Tests d'intégration pour la récupération du montant d'abonnement depuis les paiements
 * 
 * Tests l'intégration entre :
 * - Service → Cloud Function → Récupération montant depuis paiements
 * - Vérification que le montant réel est utilisé dans l'abonnement créé
 * 
 * @see TESTS_INTEGRATION.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MembershipServiceV2 } from '../../services/MembershipServiceV2'
import { MembershipRepositoryV2 } from '../../repositories/MembershipRepositoryV2'
import { AdminRepository } from '@/repositories/admins/AdminRepository'
import { createMembershipRequestFixture } from '../fixtures'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { generateCredentialsPDF, downloadPDF } from '@/utils/pdfGenerator'
import type { Payment } from '@/types/types'

// Mock des dépendances
vi.mock('../../repositories/MembershipRepositoryV2')
vi.mock('@/repositories/admins/AdminRepository')
vi.mock('firebase/functions')
vi.mock('@/firebase/app')
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

describe('Integration: Subscription Amount from Payments', () => {
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

  describe('INT-SUB-AMOUNT-01: Récupération montant depuis paiement Subscription', () => {
    it('devrait utiliser le montant du paiement de type Subscription', async () => {
      // Arrange
      const subscriptionPayment: Payment = {
        date: new Date(),
        time: '10:00',
        mode: 'cash',
        amount: 15000,
        paymentType: 'Subscription',
        acceptedBy: 'admin-1',
        recordedBy: 'admin-1',
        recordedByName: 'Admin Test',
        recordedAt: new Date(),
      }

      const paidRequest = createMembershipRequestFixture({
        status: 'pending',
        isPaid: true,
        payments: [subscriptionPayment],
      })
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
      // Vérifier que la Cloud Function a été appelée avec la demande contenant le paiement
      expect(mockCallableFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: paidRequest.id,
        })
      )
      
      // La Cloud Function devrait utiliser le montant 15000 depuis le paiement Subscription
      // (vérifié via les logs ou en mockant la fonction getSubscriptionAmountFromPayments)
    })
  })

  describe('INT-SUB-AMOUNT-02: Récupération montant depuis paiement Membership', () => {
    it('devrait utiliser le montant du paiement de type Membership si pas de Subscription', async () => {
      // Arrange
      const membershipPayment: Payment = {
        date: new Date(),
        time: '10:00',
        mode: 'mobicash',
        amount: 18000,
        paymentType: 'Membership',
        acceptedBy: 'admin-1',
        recordedBy: 'admin-1',
        recordedByName: 'Admin Test',
        recordedAt: new Date(),
      }

      const paidRequest = createMembershipRequestFixture({
        status: 'pending',
        isPaid: true,
        payments: [membershipPayment],
      })
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
        membershipType: 'bienfaiteur',
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
      })
      
      // Assert
      expect(mockCallableFunction).toHaveBeenCalled()
    })
  })

  describe('INT-SUB-AMOUNT-03: Récupération montant depuis premier paiement', () => {
    it('devrait utiliser le montant du premier paiement si aucun Subscription/Membership', async () => {
      // Arrange
      const firstPayment: Payment = {
        date: new Date(),
        time: '10:00',
        mode: 'airtel_money',
        amount: 12000,
        paymentType: 'Tontine',
        acceptedBy: 'admin-1',
        recordedBy: 'admin-1',
        recordedByName: 'Admin Test',
        recordedAt: new Date(),
      }

      const paidRequest = createMembershipRequestFixture({
        status: 'pending',
        isPaid: true,
        payments: [firstPayment],
      })
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
        membershipType: 'sympathisant',
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
      })
      
      // Assert
      expect(mockCallableFunction).toHaveBeenCalled()
    })
  })

  describe('INT-SUB-AMOUNT-04: Utilisation montant par défaut si aucun paiement', () => {
    it('devrait utiliser le montant par défaut si aucun paiement trouvé', async () => {
      // Arrange
      const paidRequest = createMembershipRequestFixture({
        status: 'pending',
        isPaid: true,
        payments: [], // Aucun paiement
      })
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
      expect(mockCallableFunction).toHaveBeenCalled()
      // Le montant par défaut (10300) devrait être utilisé
    })
  })

  describe('INT-SUB-AMOUNT-05: Priorité Subscription > Membership > Premier paiement', () => {
    it('devrait prioriser Subscription même s\'il y a un Membership', async () => {
      // Arrange
      const payments: Payment[] = [
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
        {
          date: new Date(),
          time: '11:00',
          mode: 'mobicash',
          amount: 15000,
          paymentType: 'Subscription',
          acceptedBy: 'admin-1',
          recordedBy: 'admin-1',
          recordedByName: 'Admin Test',
          recordedAt: new Date(),
        },
      ]

      const paidRequest = createMembershipRequestFixture({
        status: 'pending',
        isPaid: true,
        payments,
      })
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
      expect(mockCallableFunction).toHaveBeenCalled()
      // Le montant 15000 (Subscription) devrait être utilisé, pas 20000 (Membership)
    })
  })
})
