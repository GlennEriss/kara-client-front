import { useQuery } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { SupportCI } from '@/types/types'

/**
 * Hook pour récupérer le support actif d'un contrat
 */
export function useActiveSupport(contractId: string) {
  const service = ServiceFactory.getCaisseImprevueService()

  return useQuery<SupportCI | null>({
    queryKey: ['support-ci-active', contractId],
    queryFn: () => service.getActiveSupport(contractId),
    enabled: !!contractId,
    staleTime: 30000, // 30 secondes
  })
}

