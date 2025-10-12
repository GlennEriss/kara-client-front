import { useQuery } from '@tanstack/react-query'
import { useRef, useEffect, useCallback } from 'react'
import { CaisseImprevuFormMediator } from '@/mediators/CaisseImprevuFormMediator'
import { User } from '@/types/types'
import { toast } from 'sonner'

interface UseSearchMembersOptions {
  enabled?: boolean
  onSuccess?: (data: User[]) => void
  onError?: (error: Error) => void
  showNotifications?: boolean // Option pour activer/désactiver les notifications automatiques
}

/**
 * Hook React Query pour la recherche de membres avec gestion des callbacks
 * Gère automatiquement le cache, les états de chargement et les notifications
 * 
 * @param searchQuery - La requête de recherche
 * @param options - Options incluant enabled, onSuccess, onError, et showNotifications
 * 
 * @example
 * // Avec notifications automatiques (par défaut)
 * const { data, isLoading } = useSearchMembers(query, { enabled: true })
 * 
 * @example
 * // Avec callbacks personnalisés
 * const { data, isLoading } = useSearchMembers(query, {
 *   enabled: true,
 *   onSuccess: (data) => console.log('Trouvé:', data.length),
 *   onError: (error) => handleCustomError(error),
 *   showNotifications: false // Désactive les toasts automatiques
 * })
 */
export function useSearchMembers(
  searchQuery: string,
  options: UseSearchMembersOptions = {}
) {
  const {
    enabled = false,
    onSuccess,
    onError,
    showNotifications = true
  } = options

  const mediator = CaisseImprevuFormMediator.getInstance()

  // Refs pour tracker les changements et éviter les callbacks multiples
  const previousDataRef = useRef<User[] | undefined>(undefined)
  const previousErrorRef = useRef<Error | undefined>(undefined)
  
  // Refs pour stocker les dernières versions des callbacks (évite problèmes de dépendances)
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)

  // Mettre à jour les refs quand les callbacks changent
  useEffect(() => {
    onSuccessRef.current = onSuccess
    onErrorRef.current = onError
  }, [onSuccess, onError])

  const query = useQuery<User[], Error>({
    queryKey: ['search-members', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) {
        return []
      }
      return await mediator.searchMembers(searchQuery)
    },
    enabled: enabled && searchQuery.trim().length > 0,
    staleTime: 5 * 60 * 1000, // Les données restent fraîches pendant 5 minutes
    gcTime: 10 * 60 * 1000, // Garde le cache pendant 10 minutes
    retry: 1, // Réessaye 1 fois en cas d'erreur
    refetchOnWindowFocus: false, // Évite les requêtes inutiles au retour de focus
  })

  // Fonction de notification de succès mémorisée
  const notifySuccess = useCallback((data: User[]) => {
    if (data.length === 0) {
      toast.info('Aucun membre trouvé')
    } else {
      toast.success(`${data.length} membre(s) trouvé(s)`)
    }
  }, [])

  // Fonction de notification d'erreur mémorisée
  const notifyError = useCallback((error: Error) => {
    toast.error('Erreur lors de la recherche du membre')
    console.error('Erreur de recherche:', error)
  }, [])

  // Gestion des callbacks et notifications de manière contrôlée
  // ✅ Plus de problème de dépendances grâce aux refs
  useEffect(() => {
    // Succès : nouvelle donnée disponible
    if (query.isSuccess && query.data !== previousDataRef.current && enabled) {
      previousDataRef.current = query.data

      // Notifications automatiques si activées
      if (showNotifications) {
        notifySuccess(query.data)
      }

      // Callback personnalisé via ref (toujours à jour)
      onSuccessRef.current?.(query.data)
    }

    // Erreur : nouvelle erreur détectée
    if (query.isError && query.error !== previousErrorRef.current && enabled) {
      previousErrorRef.current = query.error

      // Notification automatique si activée
      if (showNotifications) {
        notifyError(query.error)
      }

      // Callback personnalisé via ref (toujours à jour)
      onErrorRef.current?.(query.error)
    }
  }, [query.isSuccess, query.isError, query.data, query.error, enabled, showNotifications, notifySuccess, notifyError])

  return query
}

