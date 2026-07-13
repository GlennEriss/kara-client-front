'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listDeclaredVersementsCI } from '@/db/caisse/refunds.db'

export function useDeclaredVersementsCI(contractId: string) {
  return useQuery({
    queryKey: ['declaredVersementsCI', contractId],
    queryFn: () => listDeclaredVersementsCI(contractId),
    enabled: Boolean(contractId),
  })
}

export function useDeclaredVersementsCIInvalidate() {
  const qc = useQueryClient()
  return (contractId: string) => qc.invalidateQueries({ queryKey: ['declaredVersementsCI', contractId] })
}
