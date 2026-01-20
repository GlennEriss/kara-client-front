/**
 * Tests unitaires pour useApproveMembershipRequest
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useApproveMembershipRequest } from '../../../hooks/useApproveMembershipRequest'
import { MembershipServiceV2 } from '../../../services/MembershipServiceV2'

// Mock du service
vi.mock('../../../services/MembershipServiceV2')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('useApproveMembershipRequest', () => {
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
    }
    
    vi.mocked(MembershipServiceV2.getInstance).mockReturnValue(mockService)
  })

  describe('approve', () => {
    it('devrait appeler approveMembershipRequest avec les bons paramètres', async () => {
      // Arrange
      mockService.approveMembershipRequest.mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useApproveMembershipRequest(), {
        wrapper: createWrapper(),
      })
      
      const params = {
        requestId: 'test-id',
        adminId: 'admin-123',
        membershipType: 'adherant' as const,
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
      }
      
      // Act
      await result.current.approve(params)
      
      // Assert
      expect(mockService.approveMembershipRequest).toHaveBeenCalledWith(params)
    })

    it('devrait invalider le cache après succès', async () => {
      // Arrange
      mockService.approveMembershipRequest.mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useApproveMembershipRequest(), {
        wrapper: createWrapper(),
      })
      
      const invalidateSpy = vi.spyOn(sharedQueryClient, 'invalidateQueries')
      
      // Act
      await result.current.approve({
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

    it('devrait afficher un toast de succès après approbation', async () => {
      // Arrange
      const { toast } = await import('sonner')
      const toastSuccessSpy = vi.spyOn(toast, 'success')
      mockService.approveMembershipRequest.mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useApproveMembershipRequest(), {
        wrapper: createWrapper(),
      })
      
      // Act
      await result.current.approve({
        requestId: 'test-id',
        adminId: 'admin-123',
        membershipType: 'adherant',
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
      })
      
      // Assert
      await waitFor(() => {
        expect(toastSuccessSpy).toHaveBeenCalledWith('Demande approuvée avec succès', {
          description: 'Le membre a été créé et le PDF des identifiants a été téléchargé automatiquement.',
          duration: 5000,
        })
      })
    })

    it('devrait appeler onSuccess callback si fourni', async () => {
      // Arrange
      mockService.approveMembershipRequest.mockResolvedValue(undefined)
      const onSuccess = vi.fn()
      
      const { result } = renderHook(() => useApproveMembershipRequest({ onSuccess }), {
        wrapper: createWrapper(),
      })
      
      const params = {
        requestId: 'test-id',
        adminId: 'admin-123',
        membershipType: 'adherant' as const,
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
      }
      
      // Act
      await result.current.approve(params)
      
      // Assert
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(params)
      })
    })

    it('devrait afficher un toast d\'erreur en cas d\'échec', async () => {
      // Arrange
      const { toast } = await import('sonner')
      const toastErrorSpy = vi.spyOn(toast, 'error')
      const error = new Error('Erreur de test')
      mockService.approveMembershipRequest.mockRejectedValue(error)
      
      const { result } = renderHook(() => useApproveMembershipRequest(), {
        wrapper: createWrapper(),
      })
      
      // Act
      try {
        await result.current.approve({
          requestId: 'test-id',
          adminId: 'admin-123',
          membershipType: 'adherant',
          adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
        })
      } catch {
        // Ignorer l'erreur
      }
      
      // Assert
      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith('Erreur lors de l\'approbation', {
          description: 'Erreur de test',
          duration: 5000,
        })
      })
    })

    it('devrait appeler onError callback si fourni', async () => {
      // Arrange
      const error = new Error('Erreur de test')
      mockService.approveMembershipRequest.mockRejectedValue(error)
      const onError = vi.fn()
      
      const { result } = renderHook(() => useApproveMembershipRequest({ onError }), {
        wrapper: createWrapper(),
      })
      
      const params = {
        requestId: 'test-id',
        adminId: 'admin-123',
        membershipType: 'adherant' as const,
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
      }
      
      // Act
      try {
        await result.current.approve(params)
      } catch {
        // Ignorer l'erreur
      }
      
      // Assert
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error, params)
      })
    })
  })

  describe('États de mutation', () => {
    it('devrait retourner isPending=true pendant l\'approbation', async () => {
      // Arrange
      let resolvePromise: () => void
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      mockService.approveMembershipRequest.mockReturnValue(promise)
      
      const { result } = renderHook(() => useApproveMembershipRequest(), {
        wrapper: createWrapper(),
      })
      
      // Act
      const approvePromise = result.current.approve({
        requestId: 'test-id',
        adminId: 'admin-123',
        membershipType: 'adherant',
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
      })
      
      // Assert
      await waitFor(() => {
        expect(result.current.isPending).toBe(true)
      })
      
      // Cleanup
      resolvePromise!()
      await approvePromise
    })

    it('devrait retourner isSuccess=true après succès', async () => {
      // Arrange
      mockService.approveMembershipRequest.mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useApproveMembershipRequest(), {
        wrapper: createWrapper(),
      })
      
      // Act
      await result.current.approve({
        requestId: 'test-id',
        adminId: 'admin-123',
        membershipType: 'adherant',
        adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
      })
      
      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('devrait retourner isError=true après échec', async () => {
      // Arrange
      mockService.approveMembershipRequest.mockRejectedValue(new Error('Erreur'))
      
      const { result } = renderHook(() => useApproveMembershipRequest(), {
        wrapper: createWrapper(),
      })
      
      // Act
      try {
        await result.current.approve({
          requestId: 'test-id',
          adminId: 'admin-123',
          membershipType: 'adherant',
          adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
        })
      } catch {
        // Ignorer l'erreur
      }
      
      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })

    it('devrait permettre de réinitialiser l\'état avec reset', async () => {
      // Arrange
      mockService.approveMembershipRequest.mockRejectedValue(new Error('Erreur'))
      
      const { result } = renderHook(() => useApproveMembershipRequest(), {
        wrapper: createWrapper(),
      })
      
      // Act
      try {
        await result.current.approve({
          requestId: 'test-id',
          adminId: 'admin-123',
          membershipType: 'adherant',
          adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
        })
      } catch {
        // Ignorer l'erreur
      }
      
      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
      
      result.current.reset()
      
      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(false)
        expect(result.current.isSuccess).toBe(false)
      })
    })
  })
})
