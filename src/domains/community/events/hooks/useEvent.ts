/**
 * Hook React Query — détails d'un événement
 */

import { useQuery } from '@tanstack/react-query'
import { EventsService } from '../services/EventsService'
import { EVENTS_QUERY_KEY } from './useEvents'
import type { Event } from '../entities/event.types'

const service = EventsService.getInstance()

export function useEvent(id: string | undefined) {
  return useQuery<Event | null>({
    queryKey: [...EVENTS_QUERY_KEY, 'detail', id],
    queryFn: () => (id ? service.getEventById(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}
