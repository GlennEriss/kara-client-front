import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

interface DeleteVersementParams {
  contractId: string
  monthIndex: number
  versementId: string
}

/**
 * Hook pour supprimer un versement CI (mauvaise date, erreur de saisie).
 * Autorisé uniquement si le contrat est ACTIVE.
 */
export const useDeleteVersement = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (params: DeleteVersementParams) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      const service = ServiceFactory.getCaisseImprevueService()
      return await service.deleteVersement(params.contractId, params.monthIndex, params.versementId, user.uid)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['paymentsCI', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['contractCI', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
      queryClient.invalidateQueries({ queryKey: ['activeSupport', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['supportHistory', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['checkEligibilityForSupport', variables.contractId] })
      toast.success('Versement supprimé. Les totaux du mois ont été recalculés.')
    },
    onError: (error: unknown) => {
      console.error('Erreur lors de la suppression du versement:', error)
      const message = error instanceof Error ? error.message : 'Une erreur est survenue'
      toast.error('Erreur lors de la suppression du versement', { description: message })
    },
  })
}
