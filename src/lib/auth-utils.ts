import { ServiceFactory } from '@/factories/ServiceFactory'
import { auth } from '@/firebase/auth'

/**
 * Déconnecte l'utilisateur et supprime le cookie d'authentification
 * 
 * @deprecated Utilisez useLogout() hook dans les composants React ou LogoutService directement
 * Cette fonction est conservée pour la compatibilité avec le code existant
 */
export async function logout() {
  try {
    const logoutService = ServiceFactory.getLogoutService()
    await logoutService.logout()
    
    // Redirection vers la page de connexion
    window.location.href = '/login'
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error)
    throw error
  }
}

/**
 * Rafraîchit le token d'authentification dans le cookie
 */
export async function refreshAuthToken() {
  try {
    const user = auth.currentUser
    if (user) {
      const idToken = await user.getIdToken(true) // Force refresh
      // Cookie secure uniquement en production
      const isProduction = window.location.protocol === 'https:';
      const cookieOptions = `path=/; max-age=3600; samesite=strict${isProduction ? '; secure' : ''}`;
      document.cookie = `auth-token=${idToken}; ${cookieOptions}`;
      return idToken
    }
  } catch (error) {
    console.error('Erreur lors du rafraîchissement du token:', error)
    return null
  }
}

// Variable pour stocker l'ID du timer actuel
let tokenRefreshTimer: NodeJS.Timeout | null = null

/**
 * Démarre un timer pour rafraîchir automatiquement le token
 */
export function startTokenRefreshTimer() {
  // Arrêter le timer existant s'il y en a un
  if (tokenRefreshTimer) {
    clearInterval(tokenRefreshTimer)
  }
  
  // Rafraîchir le token toutes les 50 minutes (les tokens Firebase expirent après 1 heure)
  tokenRefreshTimer = setInterval(async () => {
    await refreshAuthToken()
  }, 50 * 60 * 1000) // 50 minutes
}

/**
 * Arrête le timer de rafraîchissement du token
 */
export function stopTokenRefreshTimer() {
  if (tokenRefreshTimer) {
    clearInterval(tokenRefreshTimer)
    tokenRefreshTimer = null
  }
}