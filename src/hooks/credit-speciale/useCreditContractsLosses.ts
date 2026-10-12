'use client'

import { ServiceFactory } from '@/factories/ServiceFactory'
import type { CreditContract } from '@/types/types'
import { computeCreditLossTotal } from '@/utils/credit-losses'
import { useQuery } from '@tanstack/react-query'

export interface CreditContractLoss {
  /** Somme des pénalités non réglées. */
  unpaidPenalties: number
  unpaidPenaltiesCount: number
  /** Manque à gagner (même calcul que la fiche du contrat). */
  missedEarnings: number
}

/**
 * Pertes des contrats donnés : pénalités impayées et manque à gagner.
 * Charge les versements et pénalités de chaque contrat : à réserver à une
 * liste courte (les contrats terminés de l'onglet « En perte »).
 */
export function useCreditContractsLosses(contracts: CreditContract[], enabled = true) {
  const ids = contracts.map((contract) => contract.id).sort()

  return useQuery<Map<string, CreditContractLoss>>({
    queryKey: ['creditContractsLosses', ids],
    enabled: enabled && ids.length > 0,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const service = ServiceFactory.getCreditSpecialeService()
      const entries = await Promise.all(
        contracts.map(async (contract): Promise<[string, CreditContractLoss]> => {
          const [payments, penalties] = await Promise.all([
            service.getPaymentsByCreditId(contract.id),
            service.getUnpaidPenaltiesByCreditId(contract.id),
          ])
          return [
            contract.id,
            {
              unpaidPenalties: penalties.reduce((sum, penalty) => sum + (Number(penalty.amount) || 0), 0),
              unpaidPenaltiesCount: penalties.length,
              missedEarnings: computeCreditLossTotal(contract, payments),
            },
          ]
        }),
      )
      return new Map(entries)
    },
  })
}
