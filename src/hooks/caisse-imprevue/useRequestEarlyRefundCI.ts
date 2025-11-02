import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { toast } from 'sonner'
import { EarlyRefundCIFormData } from '@/schemas/caisse-imprevue/early-refund-ci.schema'

/**
 * Hook pour créer une demande de retrait anticipé CI
 */
export function useRequestEarlyRefundCI() {
  const queryClient = useQueryClient()
  const service = ServiceFactory.getCaisseImprevueService()

  return useMutation({
    mutationFn: async (data: {
      contractId: string
      formData: EarlyRefundCIFormData
      userId: string
    }) => {
      return service.requestEarlyRefundCI(data.contractId, {
        reason: data.formData.reason,
        withdrawalDate: data.formData.withdrawalDate,
        withdrawalTime: data.formData.withdrawalTime,
        withdrawalAmount: data.formData.withdrawalAmount,
        withdrawalMode: data.formData.withdrawalMode,
        withdrawalProof: data.formData.withdrawalProof,
        documentPdf: data.formData.documentPdf,
        userId: data.userId,
      })
    },
    onSuccess: (data, variables) => {
      // Invalider les caches liés au contrat
      queryClient.invalidateQueries({ queryKey: ['contractCI', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
      queryClient.invalidateQueries({ queryKey: ['contract-payment-stats', variables.contractId] })
      
      toast.success('Demande de retrait anticipé créée avec succès')
    },
    onError: (error: any) => {
      console.error('Erreur lors de la création de la demande de retrait anticipé:', error)
      toast.error(error?.message || 'Erreur lors de la création de la demande de retrait anticipé')
    },
  })
}

