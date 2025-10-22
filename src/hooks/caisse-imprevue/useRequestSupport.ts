import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { SupportCI } from '@/types/types'
import { toast } from 'sonner'

interface RequestSupportParams {
  contractId: string
  amount: number
  adminId: string
}

/**
 * Hook pour demander un support financier
 */
export function useRequestSupport() {
  const queryClient = useQueryClient()
  const service = ServiceFactory.getCaisseImprevueService()

  return useMutation<SupportCI, Error, RequestSupportParams>({
    mutationFn: async ({ contractId, amount, adminId }) => {
      return await service.requestSupport(contractId, amount, adminId)
    },
    onSuccess: (_, variables) => {
      toast.success('Support accordé avec succès', {
        description: 'Le support a été enregistré et sera déduit des 3 derniers mois.'
      })
      
      // Invalider les requêtes liées
      queryClient.invalidateQueries({ queryKey: ['support-ci-active', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['support-ci-history', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['contract-ci', variables.contractId] })
    },
    onError: (error) => {
      console.error('Erreur lors de la demande de support:', error)
      toast.error('Erreur lors de la demande de support', {
        description: error.message || 'Une erreur est survenue'
      })
    },
  })
}

