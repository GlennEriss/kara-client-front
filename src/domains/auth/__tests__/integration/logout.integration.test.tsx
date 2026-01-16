/**
 * Tests d'intégration pour le module logout
 * 
 * Ces tests vérifient l'intégration entre LogoutService, useLogout et les composants
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { LogoutService } from '../../services/LogoutService'
import { useLogout } from '../../hooks/useLogout'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { signOut } from 'firebase/auth'

// Mock de Firebase Auth
vi.mock('@/firebase/auth', () => ({
  auth: {},
}))

const mockSignOut = vi.fn()

vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual('firebase/auth')
  return {
    ...actual,
    signOut: vi.fn(),
  }
})

// Mock de next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}))

// Mock de routes
vi.mock('@/constantes/routes', () => ({
  default: {
    public: { login: '/login' },
  },
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'TestWrapper'
  return Wrapper
}

describe('Logout Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(signOut).mockClear()
    ServiceFactory.clearAllServices()
    
    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    })
    
    // Mock window.location.protocol
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        protocol: 'http:',
      },
    })
  })

  describe('LogoutService + useLogout', () => {
    it('devrait intégrer correctement LogoutService avec useLogout', async () => {
      vi.mocked(signOut).mockResolvedValue(undefined)

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper(),
      })

      await result.current.logout()

      await waitFor(() => {
        // Vérifier que le service a été appelé
        expect(signOut).toHaveBeenCalled()
        
        // Vérifier que le cookie a été supprimé
        expect(document.cookie).toContain('auth-token=;')
        
        // Vérifier que la redirection a été appelée
        expect(mockPush).toHaveBeenCalledWith('/login')
        
        // Vérifier que isLoading est revenu à false
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('devrait gérer les erreurs de manière cohérente entre le service et le hook', async () => {
      const error = new Error('Firebase error')
      vi.mocked(signOut).mockRejectedValue(error)

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper(),
      })

      await expect(result.current.logout()).rejects.toThrow('LOGOUT_FAILED')

      await waitFor(() => {
        expect(result.current.error).toBeDefined()
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('devrait utiliser le service depuis ServiceFactory', async () => {
      vi.mocked(signOut).mockResolvedValue(undefined)

      // Vérifier que le service est bien récupéré depuis ServiceFactory
      const logoutService = ServiceFactory.getLogoutService()
      expect(logoutService).toBeInstanceOf(LogoutService)

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper(),
      })

      await result.current.logout()

      await waitFor(() => {
        expect(signOut).toHaveBeenCalled()
      })
    })
  })

  describe('Comportement en production vs développement', () => {
    it('devrait utiliser secure cookie en production', async () => {
      vi.mocked(signOut).mockResolvedValue(undefined)
      window.location.protocol = 'https:'

      const logoutService = new LogoutService()
      await logoutService.logout()

      expect(document.cookie).toContain('secure')
    })

    it('ne devrait pas utiliser secure cookie en développement', async () => {
      vi.mocked(signOut).mockResolvedValue(undefined)
      window.location.protocol = 'http:'

      const logoutService = new LogoutService()
      await logoutService.logout()

      expect(document.cookie).not.toContain('secure')
    })
  })
})
