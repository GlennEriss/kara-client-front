import { useQuery } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'

/**
 * Hook pour vérifier l'éligibilité d'un contrat pour un support
 */
export function useCheckEligibilityForSupport(contractId: string) {
  const service = ServiceFactory.getCaisseImprevueService()

  return useQuery<boolean>({
    queryKey: ['support-ci-eligibility', contractId],
    queryFn: () => service.checkEligibilityForSupport(contractId),
    enabled: !!contractId,
    staleTime: 10000, // 10 secondes
  })
}

