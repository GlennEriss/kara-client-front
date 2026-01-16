/**
 * Interface pour le service de déconnexion
 */
export interface ILogoutService {
  /**
   * Déconnecte l'utilisateur
   * - Déconnecte Firebase Auth
   * - Supprime le cookie d'authentification
   * 
   * @returns Promise qui se résout quand la déconnexion est terminée
   * @throws Error si la déconnexion échoue
   */
  logout(): Promise<void>
}
