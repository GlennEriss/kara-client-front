'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ContractCIFilters } from '../entities/contract-filters.types'
import { CaisseImprevueContractsService } from '../services/CaisseImprevueContractsService'
import { readContractsCIPage } from '../repositories/readContractsCIPage'
import { applyContractListScope, canPaginateContractsCI, type ContractCIPage, type ContractListScope } from '../utils/contract-pagination'

export function useContractsCIPage(filters: ContractCIFilters, scope: ContractListScope, page: number, pageSize: number) {
  const queryClient = useQueryClient()
  const key = (pageNumber: number) => ['contractsCI', 'page', filters, scope, pageNumber, pageSize] as const
  const result = useQuery<ContractCIPage>({
    queryKey: key(page),
    queryFn: async () => {
      if (canPaginateContractsCI(filters, scope)) {
        const previous = queryClient.getQueryData<ContractCIPage>(key(page - 1))
        return readContractsCIPage(filters, scope, page, pageSize, previous?.nextCursor)
      }
      // Réutilisé entre pages : recherche, retards, retraits et métriques sont filtrés sur l'ensemble.
      const all = await queryClient.fetchQuery({
        queryKey: ['contractsCI', 'filtered', filters],
        queryFn: () => CaisseImprevueContractsService.getInstance().getContractsWithFilters(filters, { throwOnError: true }),
        staleTime: 5 * 60 * 1000,
      })
      const scoped = applyContractListScope(all, scope)
      return { items: scoped.slice((page - 1) * pageSize, page * pageSize), total: scoped.length, nextCursor: null }
    },
    staleTime: 5 * 60 * 1000,
  })
  return {
    ...result,
    refetch: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contractsCI', 'filtered'], refetchType: 'none' })
      return result.refetch()
    },
  }
}
