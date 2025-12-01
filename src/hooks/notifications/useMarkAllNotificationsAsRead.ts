import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'

/**
 * Hook pour marquer toutes les notifications comme lues
 */
export function useMarkAllNotificationsAsRead() {
  const notificationService = ServiceFactory.getNotificationService()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      // Invalider les queries pour rafraîchir l'affichage
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

