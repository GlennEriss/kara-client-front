/**
 * Tests unitaires pour useLogout
 * 
 * @see https://vitest.dev/
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useLogout } from '../../hooks/useLogout'
import { ServiceFactory } from '@/factories/ServiceFactory'

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

// Mock de ServiceFactory
const mockLogoutService = {
  logout: vi.fn(),
}

vi.mock('@/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getLogoutService: vi.fn(() => mockLogoutService),
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

describe('useLogout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogoutService.logout.mockResolvedValue(undefined)
  })

  it('devrait initialiser avec isLoading à false', () => {
    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('devrait appeler logout du service et rediriger vers login', async () => {
    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    })

    await result.current.logout()

    await waitFor(() => {
      expect(mockLogoutService.logout).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith('/login')
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('devrait gérer isLoading correctement pendant la déconnexion', async () => {
    let resolveLogout: () => void
    const logoutPromise = new Promise<void>((resolve) => {
      resolveLogout = resolve
    })
    mockLogoutService.logout.mockReturnValue(logoutPromise)

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    })

    const logoutPromise2 = result.current.logout()

    // Attendre que isLoading devienne true (React met à jour l'état de manière asynchrone)
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    }, { timeout: 1000 })

    // Résoudre la promesse
    resolveLogout!()
    await logoutPromise2

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('devrait gérer les erreurs lors de la déconnexion', async () => {
    const error = new Error('LOGOUT_FAILED')
    mockLogoutService.logout.mockRejectedValue(error)

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    })

    await expect(result.current.logout()).rejects.toThrow('LOGOUT_FAILED')

    await waitFor(() => {
      expect(result.current.error).toBe(error)
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('devrait réinitialiser l\'erreur lors d\'une nouvelle tentative', async () => {
    // Première tentative qui échoue
    const error = new Error('LOGOUT_FAILED')
    mockLogoutService.logout.mockRejectedValueOnce(error)

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    })

    await expect(result.current.logout()).rejects.toThrow()
    
    // Attendre que l'erreur soit définie
    await waitFor(() => {
      expect(result.current.error).toBe(error)
    })

    // Deuxième tentative qui réussit
    mockLogoutService.logout.mockResolvedValueOnce(undefined)
    await result.current.logout()

    await waitFor(() => {
      expect(result.current.error).toBe(null)
      expect(result.current.isLoading).toBe(false)
    })
  })
})
