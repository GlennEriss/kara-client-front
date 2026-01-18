import { useQuery } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { NotificationFilters } from '@/types/types'

/**
 * Hook pour récupérer les notifications avec filtres
 */
export function useNotifications(filters?: NotificationFilters) {
  const notificationService = ServiceFactory.getNotificationService()

  return useQuery({
    queryKey: ['notifications', filters],
    queryFn: () => notificationService.getNotifications(filters),
    staleTime: 30 * 1000, // 30 secondes
    refetchInterval: 60 * 1000, // Rafraîchir toutes les 60 secondes
  })
}

