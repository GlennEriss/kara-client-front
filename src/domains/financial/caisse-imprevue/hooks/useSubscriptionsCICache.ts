/**
 * Hook React Query pour mettre en cache les forfaits Caisse Imprévue
 * 
 * Cache : staleTime 30 min, gcTime 60 min
 * Utilisé dans Step 2 du formulaire de création
 */

import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { RepositoryFactory } from '@/factories/RepositoryFactory'
import { collection, db, onSnapshot, orderBy, query, where } from '@/firebase/firestore'
import type { SubscriptionCI } from '../entities/subscription.types'

const subscriptionRepository = RepositoryFactory.getSubscriptionCIRepository()
const SUBSCRIPTIONS_CI_CACHE_QUERY_KEY = ['subscriptions-ci-cache'] as const

export function useSubscriptionsCICache() {
  const queryClient = useQueryClient()

  const queryResult = useQuery<SubscriptionCI[]>({
    queryKey: SUBSCRIPTIONS_CI_CACHE_QUERY_KEY,
    queryFn: async () => {
      // Récupérer tous les forfaits actifs
      const subscriptions = await subscriptionRepository.getActiveSubscriptions()
      return subscriptions
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 60 minutes
  })

  useEffect(() => {
    const subscriptionsQuery = query(
      collection(db, firebaseCollectionNames.subscriptionsCI || 'subscriptionsCI'),
      where('status', '==', 'ACTIVE'),
      orderBy('code', 'asc')
    )

    const unsubscribe = onSnapshot(subscriptionsQuery, (snapshot) => {
      const liveSubscriptions = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data() as Record<string, unknown>

        return {
          id: docSnapshot.id,
          ...(data as SubscriptionCI),
          createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
          updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
        } as SubscriptionCI
      })

      queryClient.setQueryData(SUBSCRIPTIONS_CI_CACHE_QUERY_KEY, liveSubscriptions)
    })

    return unsubscribe
  }, [queryClient])

  return queryResult
}
