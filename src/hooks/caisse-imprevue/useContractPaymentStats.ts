import { useQuery } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'

/**
 * Hook pour récupérer les statistiques de paiement d'un contrat CI
 * - totalAmountPaid: montant total versé (somme des targetAmount)
 * - paymentCount: nombre de versements effectués
 * - supportCount: nombre total d'aides reçues
 */
export function useContractPaymentStats(contractId: string | undefined) {
  const service = ServiceFactory.getCaisseImprevueService()

  return useQuery({
    queryKey: ['contract-payment-stats', contractId],
    queryFn: () => service.getContractPaymentStats(contractId!),
    enabled: !!contractId,
    staleTime: 60000, // 1 minute
  })
}

