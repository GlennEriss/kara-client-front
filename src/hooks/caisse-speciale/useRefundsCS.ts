'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listRefunds } from '@/db/caisse/refunds.db'

export function useRefundsCS(contractId: string) {
  return useQuery({
    queryKey: ['refundsCS', contractId],
    queryFn: () => listRefunds(contractId),
    enabled: Boolean(contractId),
  })
}

export function useRefundsCSInvalidate() {
  const qc = useQueryClient()
  return (contractId: string) => qc.invalidateQueries({ queryKey: ['refundsCS', contractId] })
}
