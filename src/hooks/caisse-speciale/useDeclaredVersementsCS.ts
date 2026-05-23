'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listDeclaredVersementsCS } from '@/db/caisse/refunds.db'

export function useDeclaredVersementsCS(contractId: string) {
  return useQuery({
    queryKey: ['declaredVersementsCS', contractId],
    queryFn: () => listDeclaredVersementsCS(contractId),
    enabled: Boolean(contractId),
  })
}

export function useDeclaredVersementsCSInvalidate() {
  const qc = useQueryClient()
  return (contractId: string) => qc.invalidateQueries({ queryKey: ['declaredVersementsCS', contractId] })
}
