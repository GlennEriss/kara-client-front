/**
 * Tests unitaires pour LogoutService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LogoutService } from '../../services/LogoutService'
import { signOut } from 'firebase/auth'

// Mock de Firebase Auth

vi.mock('@/firebase/auth', () => ({
  auth: {},
}))

vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual('firebase/auth')
  return {
    ...actual,
    signOut: vi.fn(),
  }
})

describe('LogoutService', () => {
  let logoutService: LogoutService

  beforeEach(() => {
    logoutService = new LogoutService()
    vi.clearAllMocks()
    vi.mocked(signOut).mockClear()
    
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

  describe('logout', () => {
    it('devrait déconnecter Firebase et supprimer le cookie en développement', async () => {
      vi.mocked(signOut).mockResolvedValue(undefined)
      window.location.protocol = 'http:'

      await logoutService.logout()

      expect(signOut).toHaveBeenCalled()
      expect(document.cookie).toContain('auth-token=;')
      expect(document.cookie).not.toContain('secure')
    })

    it('devrait déconnecter Firebase et supprimer le cookie en production', async () => {
      vi.mocked(signOut).mockResolvedValue(undefined)
      window.location.protocol = 'https:'

      await logoutService.logout()

      expect(signOut).toHaveBeenCalled()
      expect(document.cookie).toContain('auth-token=;')
      expect(document.cookie).toContain('secure')
    })

    it('devrait gérer les erreurs de déconnexion Firebase', async () => {
      const error = new Error('Firebase error')
      vi.mocked(signOut).mockRejectedValue(error)

      await expect(logoutService.logout()).rejects.toThrow('LOGOUT_FAILED')
      expect(signOut).toHaveBeenCalled()
    })

    it('devrait supprimer le cookie avec les bonnes options', async () => {
      vi.mocked(signOut).mockResolvedValue(undefined)
      window.location.protocol = 'http:'

      await logoutService.logout()

      const cookieString = document.cookie
      expect(cookieString).toContain('auth-token=;')
      expect(cookieString).toContain('path=/')
      expect(cookieString).toContain('expires=Thu, 01 Jan 1970 00:00:00 GMT')
      expect(cookieString).toContain('samesite=strict')
    })

    it('devrait avoir le nom correct', () => {
      expect(logoutService.name).toBe('LogoutService')
    })
  })
})
