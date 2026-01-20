/**
 * Hook React Query pour approuver une demande d'adhésion
 * 
 * Gère la mutation d'approbation avec :
 * - Gestion des toasts de succès/erreur
 * - Invalidation des caches
 * - Callbacks de succès/erreur
 * - Téléchargement automatique du PDF des identifiants
 */

'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { MembershipServiceV2 } from '../services/MembershipServiceV2'
import { MEMBERSHIP_REQUEST_CACHE } from '@/constantes/membership-requests'
import type { ApproveMembershipRequestParams } from '../services/interfaces/IMembershipService'

interface UseApproveMembershipRequestOptions {
  onSuccess?: (params: ApproveMembershipRequestParams) => void
  onError?: (error: Error, params: ApproveMembershipRequestParams) => void
}

export function useApproveMembershipRequest(options?: UseApproveMembershipRequestOptions) {
  const queryClient = useQueryClient()
  const service = MembershipServiceV2.getInstance()

  const mutation = useMutation({
    mutationFn: (params: ApproveMembershipRequestParams) =>
      service.approveMembershipRequest(params),
    onSuccess: (_, params) => {
      // Invalider les queries pour refetch
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY] 
      })
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.STATS_QUERY_KEY] 
      })

      // Toast de succès
      toast.success('Demande approuvée avec succès', {
        description: 'Le membre a été créé et le PDF des identifiants a été téléchargé automatiquement.',
        duration: 5000,
      })

      // Callback personnalisé
      if (options?.onSuccess) {
        options.onSuccess(params)
      }
    },
    onError: (error: Error, params) => {
      // Toast d'erreur
      toast.error('Erreur lors de l\'approbation', {
        description: error.message || 'Une erreur est survenue lors de l\'approbation de la demande.',
        duration: 5000,
      })

      // Callback personnalisé
      if (options?.onError) {
        options.onError(error, params)
      }
    },
  })

  // Fonction helper pour approuver
  const approve = useCallback(
    async (params: ApproveMembershipRequestParams) => {
      return mutation.mutateAsync(params)
    },
    [mutation]
  )

  return {
    approve,
    isPending: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    reset: mutation.reset,
  }
}
