import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ServiceFactory } from '@/factories/ServiceFactory'
import routes from '@/constantes/routes'

/**
 * Hook pour gérer la déconnexion de l'utilisateur
 * 
 * @returns Objet contenant la fonction logout et l'état de chargement
 */
export function useLogout() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const logout = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const logoutService = ServiceFactory.getLogoutService()
      await logoutService.logout()
      
      // Redirection vers la page de connexion
      router.push(routes.public.login)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur lors de la déconnexion')
      setError(error)
      console.error('Erreur lors de la déconnexion:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [router])

  return {
    logout,
    isLoading,
    error,
  }
}
