/**
 * Hook React Query — statistiques globales des événements (dashboard)
 */

import { useQuery } from '@tanstack/react-query'
import { EventsService } from '../services/EventsService'
import { EVENTS_QUERY_KEY } from './useEvents'
import type { EventStats } from '../entities/event-filters.types'

const service = EventsService.getInstance()

export function useEventStats() {
  return useQuery<EventStats>({
    queryKey: [...EVENTS_QUERY_KEY, 'stats'],
    queryFn: () => service.getStats(),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
