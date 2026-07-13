'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CharityEventService } from '@/services/bienfaiteur/CharityEventService'
import { CharityEvent, CharityEventFilters } from '@/types/types'
import { useAuth } from '@/hooks/useAuth'
import { useAuditLogger } from '@/hooks/useAuditLog'

/**
 * Hook pour récupérer la liste paginée des évènements
 */
export function useCharityEventsList(filters?: CharityEventFilters, page: number = 1, pageSize: number = 12) {
  return useQuery({
    queryKey: ['charity-events', 'list', filters, page, pageSize],
    queryFn: () => CharityEventService.getPaginatedEvents(filters, page, pageSize),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook pour récupérer tous les évènements sans pagination (pour exports)
 */
export function useAllCharityEvents(filters?: CharityEventFilters) {
  return useQuery({
    queryKey: ['charity-events', 'all', filters],
    queryFn: () => CharityEventService.getAllEvents(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook pour récupérer un évènement par son ID
 */
export function useCharityEvent(eventId: string) {
  return useQuery({
    queryKey: ['charity-events', eventId],
    queryFn: () => CharityEventService.getEventById(eventId),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Hook pour récupérer les statistiques globales
 */
export function useCharityGlobalStats() {
  return useQuery({
    queryKey: ['charity-events', 'global-stats'],
    queryFn: () => CharityEventService.getGlobalStats(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

/**
 * Hook pour récupérer les statistiques d'un évènement
 */
export function useCharityEventStats(eventId: string) {
  return useQuery({
    queryKey: ['charity-events', eventId, 'stats'],
    queryFn: () => CharityEventService.getEventStats(eventId),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook pour créer un évènement
 */
export function useCreateCharityEvent() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { log } = useAuditLogger()

  return useMutation({
    mutationFn: (event: Omit<CharityEvent, 'id'>) => {
      if (!user?.uid) throw new Error('User not authenticated')
      return CharityEventService.createEvent(event, user.uid)
    },
    onSuccess: (result: any, event) => {
      queryClient.invalidateQueries({ queryKey: ['charity-events'] })
      log({ action: 'create', module: 'bienfaiteur', moduleLabel: 'Bienfaiteur', targetType: 'événement', targetId: result?.id, description: `Création de l'évènement caritatif « ${event.title ?? ''} »` })
    },
  })
}

/**
 * Hook pour mettre à jour un évènement
 */
export function useUpdateCharityEvent() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { log } = useAuditLogger()

  return useMutation({
    mutationFn: ({ eventId, updates }: { eventId: string; updates: Partial<CharityEvent> }) => {
      if (!user?.uid) throw new Error('User not authenticated')
      return CharityEventService.updateEvent(eventId, updates, user.uid)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['charity-events', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['charity-events', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['charity-events', 'global-stats'] })
      log({ action: 'update', module: 'bienfaiteur', moduleLabel: 'Bienfaiteur', targetType: 'événement', targetId: variables.eventId, description: 'Modification d\'un évènement caritatif' })
    },
  })
}

/**
 * Hook pour supprimer un évènement
 */
export function useDeleteCharityEvent() {
  const queryClient = useQueryClient()
  const { log } = useAuditLogger()

  return useMutation({
    mutationFn: (eventId: string) => CharityEventService.deleteEvent(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['charity-events'] })
      log({ action: 'delete', module: 'bienfaiteur', moduleLabel: 'Bienfaiteur', targetType: 'événement', targetId: eventId, description: 'Suppression d\'un évènement caritatif' })
    },
  })
}

/**
 * Hook pour rechercher des évènements
 */
export function useSearchCharityEvents(searchQuery: string) {
  return useQuery({
    queryKey: ['charity-events', 'search', searchQuery],
    queryFn: () => CharityEventService.searchEvents(searchQuery),
    enabled: searchQuery.length >= 2,
    staleTime: 1000 * 60 * 5,
  })
}
