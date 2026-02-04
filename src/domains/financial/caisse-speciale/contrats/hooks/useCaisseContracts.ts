import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CaisseContractsService } from '../services/CaisseContractsService'
import type { ContractFilters, PaginationParams, PaginatedContracts, ContractStats } from '../entities/contract-filters.types'
import type { ContractPayment, CreateCaisseContractInput, ContractPdfMetadata, UploadContractPdfInput } from '../entities/contract.types'

const service = CaisseContractsService.getInstance()

export function useCaisseContracts(filters?: ContractFilters, pagination?: PaginationParams) {
  return useQuery<PaginatedContracts>({
    queryKey: ['caisse-contracts', filters, pagination],
    queryFn: () => service.getContractsWithFilters(filters, pagination),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useCaisseContractsStats(filters?: ContractFilters) {
  return useQuery<ContractStats>({
    queryKey: ['caisse-contracts-stats', filters],
    queryFn: () => service.getContractsStats(filters),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useCaisseContract(contractId?: string) {
  return useQuery({
    queryKey: ['caisse-contract', contractId],
    queryFn: () => (contractId ? service.getContractById(contractId) : null),
    enabled: Boolean(contractId),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useCreateCaisseContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCaisseContractInput) => service.createContract(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caisse-contracts'] })
      qc.invalidateQueries({ queryKey: ['caisse-contracts-stats'] })
    },
  })
}

export function useUploadContractPdf() {
  const qc = useQueryClient()
  return useMutation<ContractPdfMetadata, Error, UploadContractPdfInput>({
    mutationFn: (input) => service.uploadContractPdf(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['caisse-contract', variables.contractId] })
      qc.invalidateQueries({ queryKey: ['caisse-contracts'] })
    },
  })
}

export function useContractPayments(contractId?: string) {
  return useQuery<ContractPayment[]>({
    queryKey: ['caisse-contract-payments', contractId],
    queryFn: () => (contractId ? service.getContractPayments(contractId) : []),
    enabled: Boolean(contractId),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}
