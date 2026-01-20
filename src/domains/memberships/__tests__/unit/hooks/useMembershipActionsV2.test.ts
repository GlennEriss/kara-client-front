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
      requestCorrections: vi.fn(),
      processPayment: vi.fn(),
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
        reason: 'Documents incomplets et informations manquantes.',
      })
      
      // Assert
      expect(mockService.rejectMembershipRequest).toHaveBeenCalledWith({
        requestId: 'test-id',
        adminId: 'admin-123',
        reason: 'Documents incomplets et informations manquantes.',
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
