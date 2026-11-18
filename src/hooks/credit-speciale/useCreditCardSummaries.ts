'use client'

import { useQuery } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import type { CreditContract } from '@/types/types'
import { creditContractSummary } from '@/utils/credit-contract-summary'
import { mapWithConcurrency } from '@/utils/mapWithConcurrency'

/** Only the visible page: same totals as contract detail, without one read per entire portfolio. */
export function useCreditCardSummaries(contracts: CreditContract[]) {
  return useQuery({
    queryKey: [
      'creditContracts',
      'cardSummaries',
      contracts.map((c) => [
        c.id,
        c.updatedAt,
        c.amount,
        c.amountPaid,
        c.duration,
        c.totalAmount,
      ]),
    ],
    enabled: contracts.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const service = ServiceFactory.getCreditSpecialeService()
      const entries = await mapWithConcurrency(
        contracts,
        6,
        async (contract) => {
          const totals = creditContractSummary(
            contract,
            await service.getPaymentsByCreditId(contract.id),
          )
          return [
            contract.id,
            {
              amountPaid: totals.paid,
              amountRemaining: totals.remaining,
              totalAmount: totals.total,
            },
          ] as const
        },
      )
      return new Map(entries)
    },
  })
}
