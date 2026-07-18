'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CharityContributionService } from '@/services/bienfaiteur/CharityContributionService'
import { CharityContribution, CharityContributionInput } from '@/types/types'
import { getUserById } from '@/db/user.db'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useAuth } from '@/hooks/useAuth'
import { useAuditLogger } from '@/hooks/useAuditLog'

/** Message de notification adapté au type de contribution. */
function buildContributionMessage(contribution: CharityContributionInput): string {
  const amount = contribution.payment?.amount
  if (contribution.contributionType === 'money' && amount) {
    return `Une contribution de ${amount.toLocaleString('fr-FR')} FCFA a été enregistrée à votre nom. Merci pour votre générosité !`
  }
  return 'Une contribution en nature a été enregistrée à votre nom. Merci pour votre générosité !'
}

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
  const { log } = useAuditLogger()

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
      log({ action: 'create', module: 'bienfaiteur', moduleLabel: 'Bienfaiteur', targetType: 'contribution', targetId: variables.eventId, description: 'Ajout d\'une contribution caritative' })
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
  const { log } = useAuditLogger()

  return useMutation({
    mutationFn: ({ eventId, contributionId }: { eventId: string; contributionId: string }) => {
      return CharityContributionService.deleteContribution(eventId, contributionId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['charity-contributions', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['charity-events', variables.eventId] })
      log({ action: 'delete', module: 'bienfaiteur', moduleLabel: 'Bienfaiteur', targetType: 'contribution', targetId: variables.contributionId, description: 'Suppression d\'une contribution caritative' })
    },
  })
}

/**
 * Hook pour ajouter un participant avec sa contribution
 */
export function useAddParticipantWithContribution() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { log } = useAuditLogger()

  return useMutation({
    mutationFn: async ({
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
      const result = await CharityContributionService.addParticipantWithContribution(
        eventId,
        memberId,
        groupId,
        contribution,
        user.uid
      )

      // Prévenir le membre de la contribution enregistrée pour lui (best-effort).
      // Rien à notifier pour une contribution de groupe : pas de destinataire.
      if (memberId) {
        // Le portail membre accepte matricule OU uid comme recipientId ; on
        // privilégie le matricule, comme le fait le parcours "déclaration".
        const member = await getUserById(memberId)
        await ServiceFactory.getNotificationService().notifyMember({
          recipientId: member?.matricule || memberId,
          module: 'bienfaiteur',
          entityId: eventId,
          type: 'status_update',
          title: 'Contribution enregistrée',
          message: buildContributionMessage(contribution),
          metadata: {
            eventId,
            contributionId: result.contributionId,
            status: contribution.status,
          },
        })
      }

      return result
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['charity-contributions', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['charity-participants', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['charity-events', variables.eventId] })
      log({ action: 'create', module: 'bienfaiteur', moduleLabel: 'Bienfaiteur', targetType: 'contribution', targetId: variables.eventId, description: 'Ajout d\'un participant et de sa contribution' })
    },
  })
}

