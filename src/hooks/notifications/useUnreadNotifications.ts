import { useQuery } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'

/**
 * Hook pour récupérer les notifications non lues
 */
export function useUnreadNotifications(limit: number = 50) {
  const notificationService = ServiceFactory.getNotificationService()

  return useQuery({
    queryKey: ['notifications', 'unread', limit],
    queryFn: () => notificationService.getUnreadNotifications(limit),
    staleTime: 30 * 1000, // 30 secondes
    refetchInterval: 60 * 1000, // Rafraîchir toutes les 60 secondes
  })
}

