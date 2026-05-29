/**
 * Hook React Query — liste des votants d'un événement (admin)
 * Réservé à l'admin : permet de voir qui a voté quelle option.
 */

import { useQuery } from '@tanstack/react-query'
import { EventsService } from '../services/EventsService'
import { EVENTS_QUERY_KEY } from './useEvents'
import type { EventVoter } from '../entities/event-vote.types'

const service = EventsService.getInstance()

export function useEventVoters(eventId: string | undefined) {
  return useQuery<EventVoter[]>({
    queryKey: [...EVENTS_QUERY_KEY, 'voters', eventId],
    queryFn: () =>
      eventId ? service.listVoters(eventId) : Promise.resolve([]),
    enabled: !!eventId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}
