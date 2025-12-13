'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { ContractCI } from '@/types/types'

/**
 * Hook pour récupérer les contrats CI d'un membre
 */
export function useContractsCIByMemberId(memberId: string | undefined) {
  const service = ServiceFactory.getCaisseImprevueService()

  return useQuery<ContractCI[]>({
    queryKey: ['contractsCI', 'memberId', memberId],
    queryFn: () => service.getContractsCIByMemberId(memberId!),
    enabled: !!memberId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook pour vérifier si un membre est à jour à la CI
 */
export function useMemberCIStatus(memberId: string | undefined) {
  const { data: contracts = [], isLoading } = useContractsCIByMemberId(memberId)

  const { isUpToDate, hasActiveContract } = React.useMemo(() => {
    if (!contracts || contracts.length === 0) {
      return { isUpToDate: false, hasActiveContract: false }
    }
    
    const activeContracts = contracts.filter(c => c.status === 'ACTIVE')
    const hasActive = activeContracts.length > 0

    // Pour simplifier, on considère qu'un membre avec un contrat actif est à jour
    // Une logique plus précise nécessiterait de vérifier les paiements récents (30 jours)
    // mais cela nécessiterait d'appeler le service de paiements CI, ce qui serait trop coûteux
    return {
      isUpToDate: hasActive, // Simplification : contrat actif = à jour
      hasActiveContract: hasActive,
    }
  }, [contracts])

  return {
    isUpToDate,
    hasActiveContract,
    isLoading,
  }
}

