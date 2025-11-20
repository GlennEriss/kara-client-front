'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CharityParticipantService } from '@/services/bienfaiteur/CharityParticipantService'
import { useAuth } from '@/hooks/useAuth'

/**
 * Hook pour récupérer les participants d'un évènement
 */
export function useCharityParticipants(eventId: string, type?: 'member' | 'group') {
  return useQuery({
    queryKey: ['charity-participants', eventId, type],
    queryFn: () => CharityParticipantService.getParticipantsByEvent(eventId, type),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook pour ajouter un participant
 */
export function useAddCharityParticipant() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({
      eventId,
      participantType,
      memberId,
      groupId
    }: {
      eventId: string
      participantType: 'member' | 'group'
      memberId?: string
      groupId?: string
    }) => {
      if (!user?.uid) throw new Error('User not authenticated')
      return CharityParticipantService.addParticipant(
        eventId,
        participantType,
        memberId,
        groupId,
        user.uid
      )
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['charity-participants', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['charity-events', variables.eventId] })
    },
  })
}

/**
 * Hook pour retirer un participant
 */
export function useRemoveCharityParticipant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, participantId }: { eventId: string; participantId: string }) =>
      CharityParticipantService.removeParticipant(eventId, participantId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['charity-participants', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['charity-events', variables.eventId] })
    },
  })
}

/**
 * Hook pour récupérer les statistiques d'un participant
 */
export function useCharityParticipantStats(eventId: string, participantId: string) {
  return useQuery({
    queryKey: ['charity-participants', eventId, participantId, 'stats'],
    queryFn: () => CharityParticipantService.getParticipantStats(eventId, participantId),
    enabled: !!eventId && !!participantId,
    staleTime: 1000 * 60 * 2,
  })
}

