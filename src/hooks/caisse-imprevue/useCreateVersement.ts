import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { toast } from 'sonner'
import { PaymentMode } from '@/types/types'

export interface VersementFormData {
  date: string
  time: string
  amount: number
  mode: PaymentMode
  penalty?: number
  daysLate?: number
}

interface CreateVersementParams {
  contractId: string
  monthIndex: number
  versementData: VersementFormData
  proofFile: File
  userId: string
}

/**
 * Hook pour créer un versement dans un paiement CI
 */
export const useCreateVersement = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateVersementParams) => {
      const service = ServiceFactory.getCaisseImprevueService()
      return await service.createVersement(
        params.contractId,
        params.monthIndex,
        params.versementData,
        params.proofFile,
        params.userId
      )
    },
    onSuccess: (data, variables) => {
      // Invalider les queries pour rafraîchir automatiquement
      queryClient.invalidateQueries({ queryKey: ['paymentsCI', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['contractCI', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
      
      toast.success('Versement enregistré avec succès', {
        description: `Montant: ${variables.versementData.amount.toLocaleString('fr-FR')} FCFA`
      })
    },
    onError: (error: any) => {
      console.error('Erreur lors de la création du versement:', error)
      toast.error('Erreur lors de l\'enregistrement du versement', {
        description: error.message || 'Une erreur est survenue'
      })
    },
  })
}

