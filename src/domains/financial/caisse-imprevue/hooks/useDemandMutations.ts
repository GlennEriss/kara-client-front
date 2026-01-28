/**
 * Hook React Query pour les mutations de demandes (create, accept, reject, etc.)
 * 
 * Gère les optimistic updates et l'invalidation du cache
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CaisseImprevueService } from '../services/CaisseImprevueService'
import { toast } from 'sonner'
import type {
  CaisseImprevueDemand,
  CreateCaisseImprevueDemandInput,
  UpdateCaisseImprevueDemandInput,
  AcceptDemandInput,
  RejectDemandInput,
  ReopenDemandInput,
} from '../entities/demand.types'
import type { DemandFilters, PaginationParams, SortParams } from '../entities/demand-filters.types'

const service = CaisseImprevueService.getInstance()

/**
 * Hook pour créer une demande
 */
export function useCreateDemand() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      data,
      createdBy,
    }: {
      data: CreateCaisseImprevueDemandInput
      createdBy: string
    }) => service.createDemand(data, createdBy),
    onSuccess: (demand) => {
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands'] })
      queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands-stats'] })
      
      toast.success('Demande créée avec succès', {
        description: `La demande ${demand.id} a été créée.`,
      })
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la création de la demande', {
        description: error.message,
      })
    },
  })
}

/**
 * Hook pour accepter une demande
 */
export function useAcceptDemand() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      input,
      acceptedBy,
    }: {
      id: string
      input: AcceptDemandInput
      acceptedBy: string
    }) => service.acceptDemand(id, input, acceptedBy),
    onMutate: async ({ id, input, acceptedBy }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['demand-detail', id] })
      
      const previousDemand = queryClient.getQueryData<CaisseImprevueDemand | null>(['demand-detail', id])
      
      if (previousDemand) {
        queryClient.setQueryData<CaisseImprevueDemand>(['demand-detail', id], {
          ...previousDemand,
          status: 'APPROVED',
          acceptedBy,
          acceptedAt: new Date(),
          decisionReason: input.reason,
          updatedBy: acceptedBy,
          updatedAt: new Date(),
        })
      }

      return { previousDemand }
    },
    onError: (error, variables, context) => {
      // Rollback
      if (context?.previousDemand) {
        queryClient.setQueryData(['demand-detail', variables.id], context.previousDemand)
      }
      
      toast.error('Erreur lors de l\'acceptation de la demande', {
        description: error.message,
      })
    },
    onSuccess: (demand) => {
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands'] })
      queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands-stats'] })
      queryClient.invalidateQueries({ queryKey: ['demand-detail', demand.id] })
      
      toast.success('Demande acceptée avec succès', {
        description: `La demande ${demand.id} a été acceptée.`,
      })
    },
  })
}

/**
 * Hook pour refuser une demande
 */
export function useRejectDemand() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      input,
      rejectedBy,
    }: {
      id: string
      input: RejectDemandInput
      rejectedBy: string
    }) => service.rejectDemand(id, input, rejectedBy),
    onMutate: async ({ id, input, rejectedBy }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['demand-detail', id] })
      
      const previousDemand = queryClient.getQueryData<CaisseImprevueDemand | null>(['demand-detail', id])
      
      if (previousDemand) {
        queryClient.setQueryData<CaisseImprevueDemand>(['demand-detail', id], {
          ...previousDemand,
          status: 'REJECTED',
          rejectedBy,
          rejectedAt: new Date(),
          decisionReason: input.reason,
          updatedBy: rejectedBy,
          updatedAt: new Date(),
        })
      }

      return { previousDemand }
    },
    onError: (error, variables, context) => {
      // Rollback
      if (context?.previousDemand) {
        queryClient.setQueryData(['demand-detail', variables.id], context.previousDemand)
      }
      
      toast.error('Erreur lors du refus de la demande', {
        description: error.message,
      })
    },
    onSuccess: (demand) => {
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands'] })
      queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands-stats'] })
      queryClient.invalidateQueries({ queryKey: ['demand-detail', demand.id] })
      
      toast.success('Demande refusée', {
        description: `La demande ${demand.id} a été refusée.`,
      })
    },
  })
}

/**
 * Hook pour réouvrir une demande
 */
export function useReopenDemand() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      input,
      reopenedBy,
    }: {
      id: string
      input: ReopenDemandInput
      reopenedBy: string
    }) => service.reopenDemand(id, input, reopenedBy),
    onMutate: async ({ id, input, reopenedBy }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['demand-detail', id] })
      
      const previousDemand = queryClient.getQueryData<CaisseImprevueDemand | null>(['demand-detail', id])
      
      if (previousDemand) {
        queryClient.setQueryData<CaisseImprevueDemand>(['demand-detail', id], {
          ...previousDemand,
          status: 'REOPENED',
          reopenedBy,
          reopenedAt: new Date(),
          reopenReason: input.reason,
          updatedBy: reopenedBy,
          updatedAt: new Date(),
        })
      }

      return { previousDemand }
    },
    onError: (error, variables, context) => {
      // Rollback
      if (context?.previousDemand) {
        queryClient.setQueryData(['demand-detail', variables.id], context.previousDemand)
      }
      
      toast.error('Erreur lors de la réouverture de la demande', {
        description: error.message,
      })
    },
    onSuccess: (demand) => {
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands'] })
      queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands-stats'] })
      queryClient.invalidateQueries({ queryKey: ['demand-detail', demand.id] })
      
      toast.success('Demande réouverte avec succès', {
        description: `La demande ${demand.id} a été réouverte.`,
      })
    },
  })
}

/**
 * Hook pour mettre à jour une demande
 */
export function useUpdateDemand() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
      updatedBy,
    }: {
      id: string
      data: UpdateCaisseImprevueDemandInput
      updatedBy: string
    }) => service.updateDemand(id, data, updatedBy),
    onSuccess: (demand) => {
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands'] })
      queryClient.invalidateQueries({ queryKey: ['demand-detail', demand.id] })
      
      toast.success('Demande mise à jour avec succès', {
        description: `La demande ${demand.id} a été mise à jour.`,
      })
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la mise à jour de la demande', {
        description: error.message,
      })
    },
  })
}

/**
 * Hook pour supprimer une demande
 */
export function useDeleteDemand() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      deletedBy,
    }: {
      id: string
      deletedBy: string
    }) => service.deleteDemand(id, deletedBy),
    onSuccess: (_, variables) => {
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands'] })
      queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands-stats'] })
      queryClient.removeQueries({ queryKey: ['demand-detail', variables.id] })
      
      toast.success('Demande supprimée avec succès', {
        description: `La demande ${variables.id} a été supprimée.`,
      })
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la suppression de la demande', {
        description: error.message,
      })
    },
  })
}

/**
 * Hook pour créer un contrat depuis une demande acceptée
 */
export function useCreateContractFromDemand() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      demandId,
      convertedBy,
    }: {
      demandId: string
      convertedBy: string
    }) => service.createContractFromDemand(demandId, convertedBy),
    onSuccess: (result) => {
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands'] })
      queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands-stats'] })
      queryClient.invalidateQueries({ queryKey: ['demand-detail', result.demand.id] })
      
      toast.success('Contrat créé avec succès', {
        description: `Le contrat ${result.contractId} a été créé depuis la demande ${result.demand.id}.`,
      })
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la création du contrat', {
        description: error.message,
      })
    },
  })
}
