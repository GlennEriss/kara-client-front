"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getContract, listContractsByMember, getAllContracts } from '@/db/caisse/contracts.db'
import { getContractWithComputedState } from '@/services/caisse/readers'
import { subscribe } from '@/services/caisse/mutations'

export function useContract(id: string) {
  return useQuery({
    queryKey: ['contract', id],
    queryFn: () => getContract(id),
    enabled: !!id,
  })
}

export function useContractsByMember(memberId: string, opts: { status?: string } = {}) {
  return useQuery({
    queryKey: ['contracts-by-member', memberId, opts],
    queryFn: () => listContractsByMember(memberId, opts),
    enabled: !!memberId,
  })
}

// Hook pour récupérer tous les contrats (utilisé dans les statistiques)
export function useCaisseContracts() {
  return useQuery({
    queryKey: ['caisse-contracts'],
    queryFn: () => getAllContracts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Hook pour récupérer un contrat avec son état calculé (utilisé dans les pages de détails)
export function useCaisseContract(contractId?: string) {
  return useQuery({
    queryKey: ['caisse-contract', contractId],
    queryFn: async () => contractId ? getContractWithComputedState(contractId) : null,
    enabled: !!contractId,
  })
}

// Nouveau hook pour récupérer tous les contrats
export function useAllContracts() {
  return useQuery({
    queryKey: ['all-contracts'],
    queryFn: () => getAllContracts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Hook existant pour la pipeline admin (gardé pour compatibilité)
export function useAdminCaissePipeline() {
  // Cette fonction peut être conservée si elle est utilisée ailleurs
  // ou supprimée si elle n'est plus nécessaire
  return {
    actifs: { data: [], isLoading: false },
    lateNP: { data: [], isLoading: false },
    lateWP: { data: [], isLoading: false },
    rescinded: { data: [], isLoading: false },
    finalRefund: { data: [], isLoading: false },
    closed: { data: [], isLoading: false },
  }
}

// Hook existant pour tous les contrats (gardé pour compatibilité)
export function useAllCaisseContracts(limit: number = 1000) {
  return useAllContracts()
}

// Hook pour les contrats d'un membre (gardé pour compatibilité)
export function useMemberContracts(memberId: string, status?: string) {
  return useContractsByMember(memberId, { status })
}

export function useSubscribeContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: subscribe,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caisse-contracts'] })
    }
  })
}

