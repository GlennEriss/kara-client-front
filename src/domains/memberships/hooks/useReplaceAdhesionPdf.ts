'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MembershipServiceV2 } from '../services/MembershipServiceV2'
import type { ReplaceAdhesionPdfParams } from '../services/interfaces/IMembershipService'
import { toast } from 'sonner'

export function useReplaceAdhesionPdf() {
  const queryClient = useQueryClient()
  const service = MembershipServiceV2.getInstance()

  const mutation = useMutation({
    mutationFn: (params: ReplaceAdhesionPdfParams) => service.replaceAdhesionPdf(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['membershipRequest', variables.requestId] })
      queryClient.invalidateQueries({ queryKey: ['membershipRequest-adhesionPdf', variables.requestId] })
      queryClient.invalidateQueries({ queryKey: ['membershipRequests'] })
      toast.success('PDF remplacé', {
        description: 'Le PDF d\'adhésion a été mis à jour. Le remplacement est effectif immédiatement.',
      })
    },
    onError: (error: Error) => {
      toast.error('Erreur', {
        description: error.message || 'Impossible de remplacer le PDF d\'adhésion.',
      })
    },
  })

  return {
    replaceAdhesionPdf: mutation.mutateAsync,
    isReplacing: mutation.isPending,
    error: mutation.error,
    isError: mutation.isError,
  }
}
