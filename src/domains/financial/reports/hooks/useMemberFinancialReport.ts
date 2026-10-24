'use client'

import { useQuery } from '@tanstack/react-query'
import type { FinancialReport, MonthKey } from '../entities/financial-report.types'

/** Bilan d'un membre : toute la période, ou de `from` à `to`. */
export type MemberReportRequest = { memberId: string } & ({ all: true } | { all?: false; from: MonthKey; to: MonthKey })

async function fetchMemberFinancialReport(request: MemberReportRequest): Promise<FinancialReport> {
  const params = new URLSearchParams({ memberId: request.memberId })
  if (request.all) params.set('all', '1')
  else {
    params.set('from', request.from)
    params.set('to', request.to)
  }
  const response = await fetch(`/api/financial-reports/member?${params.toString()}`)
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error || 'Impossible de générer le bilan du membre')
  }
  return response.json() as Promise<FinancialReport>
}

/** Calculé côté serveur sur les seules données du membre, à la demande. */
export function useMemberFinancialReport(request: MemberReportRequest | null) {
  return useQuery<FinancialReport>({
    queryKey: ['memberFinancialReport', request],
    enabled: !!request,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchMemberFinancialReport(request!),
  })
}
