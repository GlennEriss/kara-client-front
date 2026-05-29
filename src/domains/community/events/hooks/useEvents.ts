/**
 * Hook React Query — liste paginée d'événements (admin)
 */

import { useQuery } from '@tanstack/react-query'
import { EventsService } from '../services/EventsService'
import type {
  EventFilters,
  EventsPaginationParams,
  EventsSortParams,
  PaginatedEvents,
} from '../entities/event-filters.types'

const service = EventsService.getInstance()

export const EVENTS_QUERY_KEY = ['events'] as const

export function useEvents(
  filters?: EventFilters,
  pagination?: EventsPaginationParams,
  sort?: EventsSortParams,
) {
  return useQuery<PaginatedEvents>({
    queryKey: [...EVENTS_QUERY_KEY, 'list', filters, pagination, sort],
    queryFn: () => service.getPaginatedEvents(filters, pagination, sort),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
