'use client'

import { useQuery } from '@tanstack/react-query'
import { listRefundsCI } from '@/db/caisse/refunds.db'

export function useRefundsCI(contractId: string) {
  return useQuery({
    queryKey: ['refundsCI', contractId],
    queryFn: () => listRefundsCI(contractId),
    enabled: Boolean(contractId),
  })
}
