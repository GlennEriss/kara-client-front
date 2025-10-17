import { useQuery } from '@tanstack/react-query'
import { SubscriptionCI } from '@/types/types'
import { CaisseImprevuFormMediator } from '@/mediators/CaisseImprevuFormMediator'

/**
 * Hook React Query pour récupérer les forfaits actifs
 * Les forfaits sont filtrés et triés directement dans Firestore pour de meilleures performances
 * 
 * @example
 * const { data: activeSubscriptions, isLoading } = useActiveSubscriptionsCI()
 */
export function useActiveSubscriptionsCI() {
  const mediator = CaisseImprevuFormMediator.getInstance()

  return useQuery<SubscriptionCI[], Error>({
    queryKey: ['active-subscriptions-ci'],
    queryFn: async () => {
      // Récupère directement les forfaits actifs depuis Firestore
      // Filtre (status === 'ACTIVE') et tri (par code alphabétique) effectués côté serveur
      return await mediator.getActiveSubscriptionsCI()
    },
    staleTime: 5 * 60 * 1000, // Les données restent fraîches pendant 5 minutes
    gcTime: 10 * 60 * 1000, // Garde le cache pendant 10 minutes
    refetchOnWindowFocus: false,
  })
}

