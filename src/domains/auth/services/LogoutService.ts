import { auth } from '@/firebase/auth'
import { signOut } from 'firebase/auth'
import { ILogoutService } from './ILogoutService'

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
      // 0. Supprimer la session server-side (cookie HttpOnly)
      // (On ne peut pas supprimer un cookie HttpOnly depuis le client sans passer par le serveur)
      await fetch('/api/auth/logout', { method: 'POST' })

      // 1. Déconnexion Firebase
      await signOut(auth)
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      throw new Error('LOGOUT_FAILED')
    }
  }
}
