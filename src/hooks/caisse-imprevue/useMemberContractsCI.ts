import { useQuery } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'

export const useMemberContractsCI = (memberId: string | undefined) => {
  return useQuery({
    queryKey: ['memberContractsCI', memberId],
    queryFn: async () => {
      if (!memberId) return []
      const service = ServiceFactory.getCaisseImprevueService()
      return await service.getContractsCIByMemberId(memberId)
    },
    enabled: !!memberId,
    staleTime: 1000 * 60 * 2, // 2 minutes de cache
  })
}

