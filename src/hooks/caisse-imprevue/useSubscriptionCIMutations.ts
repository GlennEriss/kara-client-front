import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SubscriptionCI } from '@/types/types'
import { toast } from 'sonner'
import { ServiceFactory } from '@/factories'

const SUBSCRIPTIONS_QUERY_KEY = ['subscriptions-ci']

/**
 * Hook pour créer un nouveau forfait
 */
export function useCreateSubscriptionCI() {
  const queryClient = useQueryClient()
  const caisseImprevueService = ServiceFactory.getCaisseImprevueService()

  return useMutation({
    mutationFn: async (data: Omit<SubscriptionCI, 'id' | 'createdAt' | 'updatedAt'>) => {
      return await caisseImprevueService.createSubscription(data)
    },
    onSuccess: (newSubscription) => {
      // Invalider le cache pour recharger la liste
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_QUERY_KEY })
      
      // OU mettre à jour directement le cache de manière optimiste
      queryClient.setQueryData<SubscriptionCI[]>(SUBSCRIPTIONS_QUERY_KEY, (old) => {
        return old ? [newSubscription, ...old] : [newSubscription]
      })

      toast.success('Forfait créé avec succès')
    },
    onError: (error) => {
      console.error('Erreur lors de la création du forfait:', error)
      toast.error('Erreur lors de la création du forfait')
    },
  })
}

/**
 * Hook pour mettre à jour un forfait existant
 */
export function useUpdateSubscriptionCI() {
  const queryClient = useQueryClient()
  const caisseImprevueService = ServiceFactory.getCaisseImprevueService()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SubscriptionCI> }) => {
      return await caisseImprevueService.updateSubscription(id, data)
    },
    onSuccess: (updatedSubscription) => {
      // Invalider le cache
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_QUERY_KEY })
      
      // Mise à jour optimiste du cache
      queryClient.setQueryData<SubscriptionCI[]>(SUBSCRIPTIONS_QUERY_KEY, (old) => {
        return old
          ? old.map((sub) => (sub.id === updatedSubscription.id ? updatedSubscription : sub))
          : [updatedSubscription]
      })

      toast.success('Forfait modifié avec succès')
    },
    onError: (error) => {
      console.error('Erreur lors de la modification du forfait:', error)
      toast.error('Erreur lors de la modification du forfait')
    },
  })
}

/**
 * Hook pour supprimer un forfait
 */
export function useDeleteSubscriptionCI() {
  const queryClient = useQueryClient()
  const caisseImprevueService = ServiceFactory.getCaisseImprevueService()

  return useMutation({
    mutationFn: async (id: string) => {
      return await caisseImprevueService.deleteSubscription(id)
    },
    onSuccess: (_, deletedId) => {
      // Invalider le cache
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_QUERY_KEY })
      
      // Mise à jour optimiste du cache
      queryClient.setQueryData<SubscriptionCI[]>(SUBSCRIPTIONS_QUERY_KEY, (old) => {
        return old ? old.filter((sub) => sub.id !== deletedId) : []
      })

      toast.success('Forfait supprimé avec succès')
    },
    onError: (error) => {
      console.error('Erreur lors de la suppression du forfait:', error)
      toast.error('Erreur lors de la suppression du forfait')
    },
  })
}

