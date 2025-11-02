import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { toast } from 'sonner'
import { FinalRefundCIFormData } from '@/schemas/caisse-imprevue/final-refund-ci.schema'

/**
 * Hook pour créer une demande de remboursement final CI
 */
export function useRequestFinalRefundCI() {
  const queryClient = useQueryClient()
  const service = ServiceFactory.getCaisseImprevueService()

  return useMutation({
    mutationFn: async (data: {
      contractId: string
      reason: string
      withdrawalDate: string
      withdrawalTime: string
      withdrawalMode: 'cash' | 'bank_transfer' | 'airtel_money' | 'mobicash'
      withdrawalProof: File
      documentPdf: File
      userId: string
    }) => {
      return service.requestFinalRefundCI(data.contractId, {
        reason: data.reason,
        withdrawalDate: data.withdrawalDate,
        withdrawalTime: data.withdrawalTime,
        withdrawalMode: data.withdrawalMode,
        withdrawalProof: data.withdrawalProof,
        documentPdf: data.documentPdf,
        userId: data.userId,
      })
    },
    onSuccess: (data, variables) => {
      // Invalider les caches liés au contrat
      queryClient.invalidateQueries({ queryKey: ['contractCI', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
      queryClient.invalidateQueries({ queryKey: ['contract-payment-stats', variables.contractId] })
      
      toast.success('Demande de remboursement final créée avec succès')
    },
    onError: (error: any) => {
      console.error('Erreur lors de la création de la demande de remboursement final:', error)
      toast.error(error?.message || 'Erreur lors de la création de la demande de remboursement final')
    },
  })
}

