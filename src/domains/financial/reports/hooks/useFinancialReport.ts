'use client'

import { useQuery } from '@tanstack/react-query'
import type { FinancialReport, MonthKey } from '../entities/financial-report.types'

async function fetchFinancialReport(from: MonthKey, to: MonthKey): Promise<FinancialReport> {
  const response = await fetch(`/api/financial-reports?from=${from}&to=${to}`)
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error || 'Impossible de générer le bilan')
  }
  return response.json() as Promise<FinancialReport>
}

/** Bilan d'une période ; calculé côté serveur sur toutes les données, à la demande. */
export function useFinancialReport(period: { from: MonthKey; to: MonthKey } | null) {
  return useQuery<FinancialReport>({
    queryKey: ['financialReport', period?.from, period?.to],
    enabled: !!period,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchFinancialReport(period!.from, period!.to),
  })
}
