/**
 * Tests unitaires pour useMembershipActionsV2
 * 
 * Approche TDD : Tests écrits AVANT l'implémentation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMembershipActionsV2 } from '../../../hooks/useMembershipActionsV2'
import { MembershipServiceV2 } from '../../../services/MembershipServiceV2'
import type { PaymentInfo } from '../../../entities'

// Mock du service
vi.mock('../../../services/MembershipServiceV2')
// Mock de sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))
// Mock Firebase Functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn()),
}))
vi.mock('@/firebase/app', () => ({
  app: {},
}))

describe('useMembershipActionsV2', () => {
  let mockService: any
  let sharedQueryClient: QueryClient

  function createWrapper() {
    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: sharedQueryClient }, children)
    Wrapper.displayName = 'TestWrapper'
    return Wrapper
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Créer un QueryClient partagé pour les tests
    sharedQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    // Mock du service
    mockService = {
      approveMembershipRequest: vi.fn(),
      rejectMembershipRequest: vi.fn(),
      reopenMembershipRequest: vi.fn(),
      requestCorrections: vi.fn(),
      processPayment: vi.fn(),
      renewSecurityCode: vi.fn(),
    }
    
    vi.mocked(MembershipServiceV2.getInstance).mockReturnValue(mockService)
  })

  describe('approveMutation', () => {
    it('devrait appeler approveMembershipRequest avec les bons paramètres', async () => {
      // Arrange
      mockService.approveMembershipRequest.mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })
      
      // Act
      await result.current.approveMutation.mutateAsync({
        requestId: 'test-id',
        adminId: 'admin-123',
        membershipType: 'adherant',
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
      })
      
      // Assert
      expect(mockService.approveMembershipRequest).toHaveBeenCalledWith({
        requestId: 'test-id',
        adminId: 'admin-123',
        membershipType: 'adherant',
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
      })
    })

    it('devrait invalider le cache après succès', async () => {
      // Arrange
      mockService.approveMembershipRequest.mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })
      
      const invalidateSpy = vi.spyOn(sharedQueryClient, 'invalidateQueries')
      
      // Act
      await result.current.approveMutation.mutateAsync({
        requestId: 'test-id',
        adminId: 'admin-123',
        membershipType: 'adherant',
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
      })
      
      // Assert
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalled()
      })
    })
  })

  describe('rejectMutation', () => {
    it('devrait appeler rejectMembershipRequest avec le motif', async () => {
      // Arrange
      mockService.rejectMembershipRequest.mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })
      
      // Act
      await result.current.rejectMutation.mutateAsync({
        requestId: 'test-id',
        adminId: 'admin-123',
        motifReject: 'Documents incomplets et informations manquantes.',
      })
      
      // Assert
      expect(mockService.rejectMembershipRequest).toHaveBeenCalledWith({
        requestId: 'test-id',
        adminId: 'admin-123',
        motifReject: 'Documents incomplets et informations manquantes.',
      })
    })

    it('devrait invalider le cache après succès', async () => {
      // Arrange
      mockService.rejectMembershipRequest.mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })
      
      const invalidateSpy = vi.spyOn(sharedQueryClient, 'invalidateQueries')
      
      // Act
      await result.current.rejectMutation.mutateAsync({
        requestId: 'test-id',
        adminId: 'admin-123',
        motifReject: 'Documents incomplets et informations manquantes.',
      })
      
      // Assert
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['membership-requests'],
        })
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['membership-requests-stats'],
        })
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['notifications'],
        })
      })
    })

    it('devrait afficher un toast de succès après rejet', async () => {
      // Arrange
      const { toast } = await import('sonner')
      const toastSuccessSpy = vi.spyOn(toast, 'success')
      mockService.rejectMembershipRequest.mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })
      
      // Act
      await result.current.rejectMutation.mutateAsync({
        requestId: 'test-id',
        adminId: 'admin-123',
        motifReject: 'Documents incomplets et informations manquantes.',
      })
      
      // Assert
      await waitFor(() => {
        expect(toastSuccessSpy).toHaveBeenCalledWith('Demande rejetée', {
          description: 'La demande d\'adhésion a été rejetée avec succès.',
        })
      })
    })

    it('devrait afficher un toast d\'erreur si le rejet échoue', async () => {
      // Arrange
      const { toast } = await import('sonner')
      const toastErrorSpy = vi.spyOn(toast, 'error')
      const errorMessage = 'Erreur lors du rejet de la demande'
      mockService.rejectMembershipRequest.mockRejectedValue(new Error(errorMessage))
      
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })
      
      // Act
      try {
        await result.current.rejectMutation.mutateAsync({
          requestId: 'test-id',
          adminId: 'admin-123',
          motifReject: 'Documents incomplets et informations manquantes.',
        })
      } catch {
        // L'erreur est attendue
      }
      
      // Assert
      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith('Erreur lors du rejet', {
          description: errorMessage,
        })
      })
    })
  })

  describe('requestCorrectionsMutation', () => {
    it('devrait appeler requestCorrections avec les corrections', async () => {
      // Arrange
      const corrections = ['Veuillez mettre à jour votre photo.']
      mockService.requestCorrections.mockResolvedValue({
        securityCode: '123456',
        whatsAppUrl: undefined,
      })
      
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })
      
      // Act
      const response = await result.current.requestCorrectionsMutation.mutateAsync({
        requestId: 'test-id',
        adminId: 'admin-123',
        corrections,
      })
      
      // Assert
      expect(mockService.requestCorrections).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-id',
          adminId: 'admin-123',
          corrections,
        })
      )
      expect(response.securityCode).toBe('123456')
    })

    it('devrait inclure l\'URL WhatsApp si sendWhatsApp=true', async () => {
      // Arrange
      const corrections = ['Veuillez mettre à jour votre photo.']
      mockService.requestCorrections.mockResolvedValue({
        securityCode: '123456',
        whatsAppUrl: 'https://wa.me/24165671734?text=Bonjour',
      })
      
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })
      
      // Act
      const response = await result.current.requestCorrectionsMutation.mutateAsync({
        requestId: 'test-id',
        adminId: 'admin-123',
        corrections,
        sendWhatsApp: true,
      })
      
      // Assert
      expect(mockService.requestCorrections).toHaveBeenCalledWith({
        requestId: 'test-id',
        adminId: 'admin-123',
        corrections,
        sendWhatsApp: true,
      })
      expect(response.whatsAppUrl).toBe('https://wa.me/24165671734?text=Bonjour')
    })
  })

  describe('reopenMutation', () => {
    it('devrait appeler reopenMembershipRequest avec le motif de réouverture', async () => {
      // Arrange
      mockService.reopenMembershipRequest.mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })
      
      // Act
      await result.current.reopenMutation.mutateAsync({
        requestId: 'test-id',
        adminId: 'admin-123',
        reason: 'Nouvelle information disponible. Le dossier nécessite un réexamen.',
      })
      
      // Assert
      expect(mockService.reopenMembershipRequest).toHaveBeenCalledWith({
        requestId: 'test-id',
        adminId: 'admin-123',
        reason: 'Nouvelle information disponible. Le dossier nécessite un réexamen.',
      })
    })

    it('devrait invalider le cache après succès', async () => {
      // Arrange
      mockService.reopenMembershipRequest.mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })
      
      const invalidateSpy = vi.spyOn(sharedQueryClient, 'invalidateQueries')
      
      // Act
      await result.current.reopenMutation.mutateAsync({
        requestId: 'test-id',
        adminId: 'admin-123',
        reason: 'Nouvelle information disponible.',
      })
      
      // Assert
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['membership-requests'],
        })
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['membership-requests-stats'],
        })
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['notifications'],
        })
      })
    })

    it('devrait afficher un toast de succès après réouverture', async () => {
      // Arrange
      const { toast } = await import('sonner')
      const toastSuccessSpy = vi.spyOn(toast, 'success')
      mockService.reopenMembershipRequest.mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })
      
      // Act
      await result.current.reopenMutation.mutateAsync({
        requestId: 'test-id',
        adminId: 'admin-123',
        reason: 'Nouvelle information disponible.',
      })
      
      // Assert
      await waitFor(() => {
        expect(toastSuccessSpy).toHaveBeenCalledWith('Dossier réouvert', {
          description: 'La demande d\'adhésion a été réouverte avec succès.',
        })
      })
    })

    it('devrait afficher un toast d\'erreur si la réouverture échoue', async () => {
      // Arrange
      const { toast } = await import('sonner')
      const toastErrorSpy = vi.spyOn(toast, 'error')
      const errorMessage = 'Erreur lors de la réouverture du dossier'
      mockService.reopenMembershipRequest.mockRejectedValue(new Error(errorMessage))
      
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })
      
      // Act
      try {
        await result.current.reopenMutation.mutateAsync({
          requestId: 'test-id',
          adminId: 'admin-123',
          reason: 'Nouvelle information disponible.',
        })
      } catch {
        // L'erreur est attendue
      }
      
      // Assert
      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith('Erreur lors de la réouverture', {
          description: errorMessage,
        })
      })
    })
  })

  describe('deleteMutation', () => {
    let mockHttpsCallable: ReturnType<typeof vi.fn>

    beforeEach(async () => {
      const { httpsCallable, getFunctions } = await import('firebase/functions')
      mockHttpsCallable = vi.fn().mockResolvedValue({
        data: {
          success: true,
          requestId: 'test-id',
          filesDeleted: 2,
          deletedAt: new Date().toISOString(),
        },
      }) as any
      vi.mocked(httpsCallable).mockReturnValue(mockHttpsCallable as any)
      vi.mocked(getFunctions).mockReturnValue({} as any)
    })

    it('devrait appeler la Cloud Function deleteMembershipRequest avec les bons paramètres', async () => {
      // Arrange
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })
      
      // Act
      await result.current.deleteMutation.mutateAsync({
        requestId: 'test-id',
        confirmedMatricule: 'MK-2024-001234',
      })
      
      // Assert
      expect(mockHttpsCallable).toHaveBeenCalledWith({
        requestId: 'test-id',
        confirmedMatricule: 'MK-2024-001234',
      })
    })

    it('devrait invalider le cache après succès', async () => {
      // Arrange
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })
      
      const invalidateSpy = vi.spyOn(sharedQueryClient, 'invalidateQueries')
      
      // Act
      await result.current.deleteMutation.mutateAsync({
        requestId: 'test-id',
        confirmedMatricule: 'MK-2024-001234',
      })
      
      // Assert
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['membership-requests'],
        })
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['membership-requests-stats'],
        })
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['notifications'],
        })
      })
    })

    it('devrait afficher un toast de succès après suppression (sans warnings)', async () => {
      // Arrange
      const { toast } = await import('sonner')
      const toastSuccessSpy = vi.spyOn(toast, 'success')
      mockHttpsCallable.mockResolvedValue({
        data: {
          success: true,
          requestId: 'test-id',
          filesDeleted: 2,
          deletedAt: new Date().toISOString(),
        },
      })
      
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })
      
      // Act
      await result.current.deleteMutation.mutateAsync({
        requestId: 'test-id',
        confirmedMatricule: 'MK-2024-001234',
      })
      
      // Assert
      await waitFor(() => {
        expect(toastSuccessSpy).toHaveBeenCalledWith('Dossier supprimé', {
          description: 'Le dossier a été supprimé définitivement avec succès.',
        })
      })
    })

    it('devrait afficher un toast avec warnings si présents', async () => {
      // Arrange
      const { toast } = await import('sonner')
      const toastSuccessSpy = vi.spyOn(toast, 'success')
      const warning = 'Certains fichiers n\'ont pas pu être supprimés'
      mockHttpsCallable.mockResolvedValue({
        data: {
          success: true,
          requestId: 'test-id',
          filesDeleted: 1,
          deletedAt: new Date().toISOString(),
          warnings: warning,
        },
      })
      
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })
      
      // Act
      await result.current.deleteMutation.mutateAsync({
        requestId: 'test-id',
        confirmedMatricule: 'MK-2024-001234',
      })
      
      // Assert
      await waitFor(() => {
        expect(toastSuccessSpy).toHaveBeenCalledWith('Dossier supprimé', {
          description: `Dossier supprimé. ${warning}`,
        })
      })
    })

    it('devrait afficher un toast d\'erreur si la suppression échoue', async () => {
      // Arrange
      const { toast } = await import('sonner')
      const toastErrorSpy = vi.spyOn(toast, 'error')
      const errorMessage = 'Erreur lors de la suppression du dossier'
      mockHttpsCallable.mockRejectedValue(new Error(errorMessage))
      
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })
      
      // Act
      try {
        await result.current.deleteMutation.mutateAsync({
          requestId: 'test-id',
          confirmedMatricule: 'MK-2024-001234',
        })
      } catch {
        // L'erreur est attendue
      }
      
      // Assert
      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith('Erreur lors de la suppression', {
          description: errorMessage,
        })
      })
    })

    it('devrait lever une erreur si la Cloud Function retourne success: false', async () => {
      // Arrange
      mockHttpsCallable.mockResolvedValue({
        data: {
          success: false,
          requestId: 'test-id',
          filesDeleted: 0,
          deletedAt: null,
        },
      })
      
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })
      
      // Act & Assert
      await expect(
        result.current.deleteMutation.mutateAsync({
          requestId: 'test-id',
          confirmedMatricule: 'MK-2024-001234',
        })
      ).rejects.toThrow('Erreur lors de la suppression de la demande')
    })
  })

  describe('processPaymentMutation', () => {
    it('devrait appeler processPayment avec les infos de paiement', async () => {
      // Arrange
      mockService.processPayment.mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })
      
      const paymentInfo: PaymentInfo = {
        amount: 25000,
        mode: 'cash',
        date: new Date().toISOString(),
        time: '10:30',
      }
      
      // Act
      await result.current.processPaymentMutation.mutateAsync({
        requestId: 'test-id',
        adminId: 'admin-123',
        paymentInfo,
      })
      
      // Assert
      expect(mockService.processPayment).toHaveBeenCalledWith({
        requestId: 'test-id',
        adminId: 'admin-123',
        paymentInfo,
      })
    })
  })

  describe('copyCorrectionLink', () => {
    let mockWriteText: ReturnType<typeof vi.fn>

    beforeEach(() => {
      // Mock navigator.clipboard
      mockWriteText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      })
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://example.com' },
        writable: true,
        configurable: true,
      })
    })

    it('devrait copier le lien de correction dans le presse-papiers', async () => {
      // Arrange
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })

      // Act
      await result.current.copyCorrectionLink('test-request-id')

      // Assert
      expect(mockWriteText).toHaveBeenCalledWith(
        'https://example.com/register?requestId=test-request-id'
      )
    })

    it('devrait afficher un toast de succès après copie', async () => {
      // Arrange
      const { toast } = await import('sonner')
      const toastSuccessSpy = vi.spyOn(toast, 'success')
      
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })

      // Act
      await result.current.copyCorrectionLink('test-request-id')

      // Assert
      await waitFor(() => {
        expect(toastSuccessSpy).toHaveBeenCalledWith('Lien copié !', {
          description: 'Le lien de correction a été copié dans le presse-papiers.',
        })
      })
    })

    it('devrait afficher un toast d\'erreur si la copie échoue', async () => {
      // Arrange
      const { toast } = await import('sonner')
      const toastErrorSpy = vi.spyOn(toast, 'error')
      mockWriteText.mockRejectedValue(new Error('Clipboard error'))
      
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })

      // Act
      await result.current.copyCorrectionLink('test-request-id')

      // Assert
      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith('Erreur lors de la copie', {
          description: 'Impossible de copier le lien. Veuillez le copier manuellement.',
        })
      })
    })
  })

  describe('sendWhatsApp', () => {
    let mockWindowOpen: ReturnType<typeof vi.fn>

    beforeEach(() => {
      // Mock window.open
      mockWindowOpen = vi.fn()
      window.open = mockWindowOpen
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://example.com' },
        writable: true,
        configurable: true,
      })
    })

    it('devrait ouvrir WhatsApp avec le message correct', () => {
      // Arrange
      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })

      const params = {
        requestId: 'test-request-id',
        firstName: 'Jean',
        corrections: ['Veuillez mettre à jour votre photo.'],
        securityCode: '123456',
        expiryDate: new Date('2024-12-31'),
        phoneNumber: '+24165671734',
      }

      // Act
      result.current.sendWhatsApp(params)

      // Assert
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/24165671734'),
        '_blank',
        'noopener,noreferrer'
      )
    })

    it('devrait afficher un toast d\'erreur si l\'ouverture échoue', async () => {
      // Arrange
      const { toast } = await import('sonner')
      const toastErrorSpy = vi.spyOn(toast, 'error')
      mockWindowOpen.mockImplementation(() => {
        throw new Error('Failed to open')
      })

      const { result } = renderHook(() => useMembershipActionsV2(), {
        wrapper: createWrapper(),
      })

      const params = {
        requestId: 'test-request-id',
        firstName: 'Jean',
        corrections: ['Veuillez mettre à jour votre photo.'],
        securityCode: '123456',
        expiryDate: new Date('2024-12-31'),
        phoneNumber: '+24165671734',
      }

      // Act
      result.current.sendWhatsApp(params)

      // Assert
      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith('Erreur lors de l\'ouverture de WhatsApp', {
          description: 'Failed to open',
        })
      })
    })
  })
})
