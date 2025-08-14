"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listContractsByMember, listContracts } from '@/db/caisse/contracts.db'
import { getContractWithComputedState } from '@/services/caisse/readers'
import { subscribe } from '@/services/caisse/mutations'

export function useMemberContracts(memberId: string, status?: string) {
  return useQuery({
    queryKey: ['caisse-contracts', memberId, status],
    queryFn: async () => listContractsByMember(memberId, { status }),
    enabled: !!memberId,
  })
}

export function useCaisseContract(contractId?: string) {
  return useQuery({
    queryKey: ['caisse-contract', contractId],
    queryFn: async () => contractId ? getContractWithComputedState(contractId) : null,
    enabled: !!contractId,
  })
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

export function useAdminCaissePipeline() {
  return {
    actifs: useQuery({ queryKey: ['caisse-admin','ACTIVE'], queryFn: () => listContracts({ status: 'ACTIVE' }) }),
    lateNP: useQuery({ queryKey: ['caisse-admin','LATE_NO_PENALTY'], queryFn: () => listContracts({ status: 'LATE_NO_PENALTY' }) }),
    lateWP: useQuery({ queryKey: ['caisse-admin','LATE_WITH_PENALTY'], queryFn: () => listContracts({ status: 'LATE_WITH_PENALTY' }) }),
    rescinded: useQuery({ queryKey: ['caisse-admin','RESCINDED'], queryFn: () => listContracts({ status: 'RESCINDED' }) }),
    finalRefund: useQuery({ queryKey: ['caisse-admin','FINAL_REFUND_PENDING'], queryFn: () => listContracts({ status: 'FINAL_REFUND_PENDING' }) }),
    closed: useQuery({ queryKey: ['caisse-admin','CLOSED'], queryFn: () => listContracts({ status: 'CLOSED' }) }),
  }
}

export function useAllCaisseContracts(limit: number = 200) {
  return useQuery({
    queryKey: ['caisse-all', limit],
    queryFn: () => listContracts({ limit }),
  })
}

