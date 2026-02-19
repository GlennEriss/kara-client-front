import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { toast } from 'sonner'
import type { VersementFormData } from '@/services/caisse-imprevue/ICaisseImprevueService'

interface UpdateVersementParams {
  contractId: string
  monthIndex: number
  versementId: string
  versementData: VersementFormData
  proofFile: File | undefined
  modificationReason: string
  userId: string
}

/**
 * Hook pour mettre à jour un versement existant (modification avec motif)
 */
export const useUpdateVersement = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpdateVersementParams) => {
      const service = ServiceFactory.getCaisseImprevueService()
      return await service.updateVersement(
        params.contractId,
        params.monthIndex,
        params.versementId,
        params.versementData,
        params.proofFile,
        params.modificationReason,
        params.userId
      )
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['paymentsCI', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['contractCI', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
      queryClient.invalidateQueries({ queryKey: ['activeSupport', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['supportHistory', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['checkEligibilityForSupport', variables.contractId] })
      toast.success('Versement modifié avec succès')
    },
    onError: (error: unknown) => {
      console.error('Erreur lors de la modification du versement:', error)
      const message = error instanceof Error ? error.message : 'Une erreur est survenue'
      toast.error('Erreur lors de la modification du versement', { description: message })
    },
  })
}
