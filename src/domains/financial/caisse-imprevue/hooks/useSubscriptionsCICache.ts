/**
 * Hook React Query pour mettre en cache les forfaits Caisse Imprévue
 * 
 * Cache : staleTime 30 min, gcTime 60 min
 * Utilisé dans Step 2 du formulaire de création
 */

import { useQuery } from '@tanstack/react-query'
import { RepositoryFactory } from '@/factories/RepositoryFactory'
import type { SubscriptionCI } from '../entities/subscription.types'

const subscriptionRepository = RepositoryFactory.getSubscriptionCIRepository()

export function useSubscriptionsCICache() {
  return useQuery<SubscriptionCI[]>({
    queryKey: ['subscriptions-ci-cache'],
    queryFn: async () => {
      // Récupérer tous les forfaits actifs
      const subscriptions = await subscriptionRepository.getActiveSubscriptions()
      return subscriptions
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 60 minutes
  })
}
