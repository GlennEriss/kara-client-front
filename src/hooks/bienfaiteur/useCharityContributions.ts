'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CharityContributionService } from '@/services/bienfaiteur/CharityContributionService'
import { CharityContribution, CharityContributionInput } from '@/types/types'
import { useAuth } from '@/hooks/useAuth'

/**
 * Hook pour récupérer les contributions d'un évènement
 */
export function useCharityContributions(eventId: string) {
  return useQuery({
    queryKey: ['charity-contributions', eventId],
    queryFn: () => CharityContributionService.getEventContributions(eventId),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook pour récupérer une contribution spécifique
 */
export function useCharityContribution(eventId: string, contributionId: string) {
  return useQuery({
    queryKey: ['charity-contributions', eventId, contributionId],
    queryFn: () => CharityContributionService.getContributionById(eventId, contributionId),
    enabled: !!eventId && !!contributionId,
  })
}

/**
 * Hook pour créer une contribution
 */
export function useCreateCharityContribution() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ 
      eventId, 
      contribution 
    }: { 
      eventId: string
      contribution: Omit<CharityContribution, 'id'>
    }) => {
      if (!user?.uid) throw new Error('User not authenticated')
      return CharityContributionService.createContribution(eventId, contribution, user.uid)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['charity-contributions', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['charity-events', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['charity-events', variables.eventId, 'stats'] })
    },
  })
}

/**
 * Hook pour mettre à jour une contribution
 */
export function useUpdateCharityContribution() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ 
      eventId, 
      contributionId, 
      updates 
    }: { 
      eventId: string
      contributionId: string
      updates: Partial<CharityContribution>
    }) => {
      if (!user?.uid) throw new Error('User not authenticated')
      return CharityContributionService.updateContribution(eventId, contributionId, updates, user.uid)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['charity-contributions', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['charity-events', variables.eventId] })
    },
  })
}

/**
 * Hook pour supprimer une contribution
 */
export function useDeleteCharityContribution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, contributionId }: { eventId: string; contributionId: string }) => {
      return CharityContributionService.deleteContribution(eventId, contributionId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['charity-contributions', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['charity-events', variables.eventId] })
    },
  })
}

/**
 * Hook pour ajouter un participant avec sa contribution
 */
export function useAddParticipantWithContribution() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ 
      eventId, 
      memberId, 
      groupId, 
      contribution 
    }: { 
      eventId: string
      memberId?: string
      groupId?: string
      contribution: CharityContributionInput
    }) => {
      if (!user?.uid) throw new Error('User not authenticated')
      return CharityContributionService.addParticipantWithContribution(
        eventId, 
        memberId, 
        groupId, 
        contribution, 
        user.uid
      )
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['charity-contributions', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['charity-participants', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['charity-events', variables.eventId] })
    },
  })
}

