import { useQuery } from '@tanstack/react-query'
import { getNotificationService } from '@/services/notifications/getNotificationService'

/**
 * Hook pour récupérer le nombre de notifications non lues
 */
export function useUnreadCount() {
  const notificationService = getNotificationService()

  return useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: () => notificationService.getUnreadCount(),
    staleTime: 30 * 1000, // 30 secondes
    refetchInterval: 60 * 1000, // Rafraîchir toutes les 60 secondes
  })
}

