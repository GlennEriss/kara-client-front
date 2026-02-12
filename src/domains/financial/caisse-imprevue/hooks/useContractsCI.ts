'use client'

import { useQuery } from '@tanstack/react-query'
import { CaisseImprevueContractsService } from '../services/CaisseImprevueContractsService'
import type { ContractCIFilters, ContractCIStats } from '../entities/contract-filters.types'
import type { ContractCI } from '@/types/types'

const service = CaisseImprevueContractsService.getInstance()

/**
 * Hook domains pour récupérer les contrats CI avec filtres.
 * Garde les query keys legacy pour compatibilité avec les invalidations existantes.
 */
export function useContractsCI(filters?: ContractCIFilters) {
  return useQuery<ContractCI[]>({
    queryKey: ['contractsCI', filters],
    queryFn: () => service.getContractsWithFilters(filters),
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Hook domains pour récupérer les statistiques contrats CI.
 * Garde les query keys legacy pour compatibilité avec les invalidations existantes.
 */
export function useContractsCIStats(filters?: ContractCIFilters) {
  return useQuery<ContractCIStats>({
    queryKey: ['contractsCIStats', filters],
    queryFn: () => service.getContractsStats(filters),
    staleTime: 1000 * 60 * 5,
  })
}

export type { ContractCIFilters, ContractCIStats } from '../entities/contract-filters.types'
