import { useQuery } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { SupportCI } from '@/types/types'

/**
 * Hook pour récupérer l'historique des supports d'un contrat
 */
export function useSupportHistory(contractId: string) {
  const service = ServiceFactory.getCaisseImprevueService()

  return useQuery<SupportCI[]>({
    queryKey: ['support-ci-history', contractId],
    queryFn: () => service.getSupportHistory(contractId),
    enabled: !!contractId,
    staleTime: 60000, // 1 minute
  })
}

