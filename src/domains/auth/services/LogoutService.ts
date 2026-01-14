import { ILogoutService } from './ILogoutService'
import { auth } from '@/firebase/auth'
import { signOut } from 'firebase/auth'

/**
 * Service de gestion de la déconnexion
 * 
 * @see https://github.com/kara-gabon/kara-client-front/wiki/Architecture#services
 */
export class LogoutService implements ILogoutService {
  readonly name = 'LogoutService'

  /**
   * Déconnecte l'utilisateur
   * - Déconnecte Firebase Auth
   * - Supprime le cookie d'authentification
   * 
   * @returns Promise qui se résout quand la déconnexion est terminée
   * @throws Error si la déconnexion échoue
   */
  async logout(): Promise<void> {
    try {
      // 1. Déconnexion Firebase
      await signOut(auth)
      
      // 2. Supprimer le cookie d'authentification
      // Cookie secure uniquement en production
      const isProduction = window.location.protocol === 'https:'
      const cookieOptions = `path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=strict${isProduction ? '; secure' : ''}`
      document.cookie = `auth-token=; ${cookieOptions}`
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      throw new Error('LOGOUT_FAILED')
    }
  }
}
