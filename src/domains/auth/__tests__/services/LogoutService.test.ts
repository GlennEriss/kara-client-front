/**
 * Tests unitaires pour LogoutService
 */

import { signOut } from 'firebase/auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LogoutService } from '../../services/LogoutService'

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
    
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true }) as any))
  })

  describe('logout', () => {
    it('devrait supprimer la session server-side puis déconnecter Firebase', async () => {
      vi.mocked(signOut).mockResolvedValue(undefined)

      await logoutService.logout()

      expect(fetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' })
      expect(signOut).toHaveBeenCalled()
    })

    it('devrait gérer les erreurs de déconnexion Firebase', async () => {
      const error = new Error('Firebase error')
      vi.mocked(signOut).mockRejectedValue(error)

      await expect(logoutService.logout()).rejects.toThrow('LOGOUT_FAILED')
      expect(fetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' })
      expect(signOut).toHaveBeenCalled()
    })

    it('devrait avoir le nom correct', () => {
      expect(logoutService.name).toBe('LogoutService')
    })
  })
})
