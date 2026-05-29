/**
 * Hooks React Query pour les mutations d'événements
 * (create, update, delete, publish, confirmLocation, cancel)
 *
 * Toast feedback via sonner, invalidation des caches list/detail/stats.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { EventsService } from '../services/EventsService'
import { EVENTS_QUERY_KEY } from './useEvents'
import type {
  Event,
  CreateEventInput,
  UpdateEventInput,
  ConfirmLocationInput,
  CancelEventInput,
} from '../entities/event.types'

const service = EventsService.getInstance()

/**
 * Invalide toutes les queries du domaine events (list/detail/stats/voters)
 */
function useInvalidateEvents() {
  const queryClient = useQueryClient()
  return (eventId?: string) => {
    queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY })
    if (eventId) {
      queryClient.invalidateQueries({ queryKey: [...EVENTS_QUERY_KEY, 'detail', eventId] })
      queryClient.invalidateQueries({ queryKey: [...EVENTS_QUERY_KEY, 'voters', eventId] })
    }
  }
}

export function useCreateEvent() {
  const invalidate = useInvalidateEvents()
  return useMutation({
    mutationFn: ({
      data,
      createdBy,
    }: { data: CreateEventInput; createdBy: string }) => service.createEvent(data, createdBy),
    onSuccess: (event) => {
      invalidate(event.id)
      toast.success('Événement créé', {
        description: `« ${event.title} » a été enregistré en brouillon.`,
      })
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la création', { description: error.message })
    },
  })
}

export function useUpdateEvent() {
  const invalidate = useInvalidateEvents()
  return useMutation({
    mutationFn: ({
      id,
      data,
      updatedBy,
    }: { id: string; data: UpdateEventInput; updatedBy: string }) =>
      service.updateEvent(id, data, updatedBy),
    onSuccess: (event) => {
      invalidate(event.id)
      toast.success('Événement mis à jour', {
        description: `Les modifications de « ${event.title} » ont été enregistrées.`,
      })
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la mise à jour', { description: error.message })
    },
  })
}

export function useDeleteEvent() {
  const invalidate = useInvalidateEvents()
  return useMutation({
    mutationFn: ({ id, deletedBy }: { id: string; deletedBy: string }) =>
      service.deleteEvent(id, deletedBy),
    onSuccess: (_, vars) => {
      invalidate(vars.id)
      toast.success('Événement supprimé')
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la suppression', { description: error.message })
    },
  })
}

export function usePublishEvent() {
  const invalidate = useInvalidateEvents()
  return useMutation({
    mutationFn: ({ id, publishedBy }: { id: string; publishedBy: string }) =>
      service.publishEvent(id, publishedBy),
    onSuccess: (event: Event) => {
      invalidate(event.id)
      toast.success(
        event.pollEnabled ? 'Événement publié — sondage ouvert' : 'Événement publié',
        { description: `« ${event.title} » est désormais visible des membres.` },
      )
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la publication', { description: error.message })
    },
  })
}

export function useConfirmEventLocation() {
  const invalidate = useInvalidateEvents()
  return useMutation({
    mutationFn: ({
      id,
      input,
      confirmedBy,
    }: { id: string; input: ConfirmLocationInput; confirmedBy: string }) =>
      service.confirmLocation(id, input, confirmedBy),
    onSuccess: (event: Event) => {
      invalidate(event.id)
      toast.success('Lieu confirmé', {
        description: event.finalLocation
          ? `« ${event.finalLocation.name} » a été retenu pour « ${event.title} ».`
          : `Le lieu a été figé pour « ${event.title} ».`,
      })
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la confirmation du lieu', { description: error.message })
    },
  })
}

export function useCancelEvent() {
  const invalidate = useInvalidateEvents()
  return useMutation({
    mutationFn: ({
      id,
      input,
      cancelledBy,
    }: { id: string; input: CancelEventInput; cancelledBy: string }) =>
      service.cancelEvent(id, input, cancelledBy),
    onSuccess: (event: Event) => {
      invalidate(event.id)
      toast.success('Événement annulé', {
        description: `« ${event.title} » a été annulé.`,
      })
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de l\'annulation', { description: error.message })
    },
  })
}
