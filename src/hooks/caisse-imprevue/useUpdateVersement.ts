import { useAuditLogger } from '@/hooks/useAuditLog'
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
  const { log } = useAuditLogger()

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
      log({ action: 'update', module: 'caisseImprevue', moduleLabel: 'Caisse Imprévue', targetType: 'versement', targetId: variables.contractId, description: 'Modification d\'un versement de caisse imprévue' })
      queryClient.invalidateQueries({ queryKey: ['paymentsCI', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['contractCI', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
      queryClient.invalidateQueries({ queryKey: ['support-ci-active', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['support-ci-history', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['support-ci-eligibility', variables.contractId] })
      toast.success('Versement modifié avec succès')
    },
    onError: (error: unknown) => {
      console.error('Erreur lors de la modification du versement:', error)
      const message = error instanceof Error ? error.message : 'Une erreur est survenue'
      toast.error('Erreur lors de la modification du versement', { description: message })
    },
  })
}
