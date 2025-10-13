import { useQuery } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { SubscriptionCI } from '@/types/types'

/**
 * Hook React Query pour récupérer toutes les souscriptions de Caisse Imprévue
 * Utilise le service centralisé via ServiceFactory (singleton)
 */
export function useSubscriptionsCI() {
  const service = ServiceFactory.getCaisseImprevueService()

  return useQuery<SubscriptionCI[], Error>({
    queryKey: ['subscriptions-ci'],
    queryFn: async () => {
      return await service.getAllSubscriptions()
    },
    staleTime: 2 * 60 * 1000, // Les données restent fraîches pendant 2 minutes
    gcTime: 10 * 60 * 1000, // Garde le cache pendant 10 minutes
    refetchOnWindowFocus: true, // Rafraîchir quand on revient sur la fenêtre
    retry: 2, // Réessaye 2 fois en cas d'erreur
  })
}

/**
 * Hook React Query pour récupérer une souscription par ID
 */
export function useSubscriptionCI(id: string | null) {
  const service = ServiceFactory.getCaisseImprevueService()

  return useQuery<SubscriptionCI | null, Error>({
    queryKey: ['subscription-ci', id],
    queryFn: async () => {
      if (!id) return null
      return await service.getSubscriptionById(id)
    },
    enabled: !!id, // N'exécuter que si id est fourni
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

