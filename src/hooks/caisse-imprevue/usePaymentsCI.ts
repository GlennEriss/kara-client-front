import { useQuery } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'

/**
 * Hook pour récupérer tous les paiements d'un contrat CI
 */
export const usePaymentsCI = (contractId: string | undefined) => {
  return useQuery({
    queryKey: ['paymentsCI', contractId],
    queryFn: async () => {
      if (!contractId) return []
      
      const service = ServiceFactory.getCaisseImprevueService()
      return await service.getPaymentsByContractId(contractId)
    },
    enabled: !!contractId,
    staleTime: 1000 * 60 * 2, // 2 minutes de cache
  })
}

