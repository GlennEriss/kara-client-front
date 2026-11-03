import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getNotificationService } from '@/services/notifications/getNotificationService'

/**
 * Hook pour marquer une notification comme lue
 */
export function useMarkNotificationAsRead() {
  const notificationService = getNotificationService()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      // Invalider les queries pour rafraîchir l'affichage
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

