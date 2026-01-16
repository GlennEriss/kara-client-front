import { useState, useCallback } from 'react'
import { ServiceFactory } from '@/factories/ServiceFactory'
import routes from '@/constantes/routes'

/**
 * Hook pour gérer la déconnexion de l'utilisateur
 * 
 * @returns Objet contenant la fonction logout et l'état de chargement
 */
export function useLogout() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const logout = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const logoutService = ServiceFactory.getLogoutService()
      await logoutService.logout()
      
      // Redirection vers la page de connexion avec rechargement complet
      // Utiliser window.location.href au lieu de router.push() pour :
      // - Nettoyer tous les états React et les contexts
      // - Forcer le middleware à vérifier l'authentification
      // - Garantir que l'utilisateur est bien déconnecté
      window.location.href = routes.public.login
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur lors de la déconnexion')
      setError(error)
      console.error('Erreur lors de la déconnexion:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    logout,
    isLoading,
    error,
  }
}
