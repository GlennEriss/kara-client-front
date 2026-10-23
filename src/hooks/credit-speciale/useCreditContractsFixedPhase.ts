'use client'

import { ServiceFactory } from '@/factories/ServiceFactory'
import type { CreditContract } from '@/types/types'
import { getCreditContractFixedPhase, type CreditContractFixedPhase } from '@/utils/credit-speciale-history'
import { useQuery } from '@tanstack/react-query'

/**
 * Contrats entrés en partie fixe (plus d'intérêts), parmi ceux donnés.
 * Charge les versements de chaque contrat : à réserver aux contrats spéciale
 * en cours (onglet « Partie fixe »).
 */
export function useCreditContractsFixedPhase(contracts: CreditContract[], enabled = true) {
  const ids = contracts.map((contract) => contract.id).sort()

  return useQuery<Map<string, CreditContractFixedPhase>>({
    queryKey: ['creditContractsFixedPhase', ids],
    enabled: enabled && ids.length > 0,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const service = ServiceFactory.getCreditSpecialeService()
      const entries = await Promise.all(
        contracts.map(async (contract): Promise<[string, CreditContractFixedPhase] | null> => {
          const fixedPhase = getCreditContractFixedPhase(contract, await service.getPaymentsByCreditId(contract.id))
          return fixedPhase ? [contract.id, fixedPhase] : null
        }),
      )
      return new Map(entries.filter((entry): entry is [string, CreditContractFixedPhase] => entry !== null))
    },
  })
}
