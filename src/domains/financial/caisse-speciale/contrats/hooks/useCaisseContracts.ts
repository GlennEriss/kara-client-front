import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
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

export function useDeleteCaisseContract() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (contractId: string) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.deleteCaisseContract(contractId, user.uid)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caisse-contracts'] })
      queryClient.invalidateQueries({ queryKey: ['caisse-contracts-stats'] })
      queryClient.invalidateQueries({ queryKey: ['caisse-contract'] })
      queryClient.invalidateQueries({ queryKey: ['caisseSpecialeDemands'] })
      queryClient.invalidateQueries({ queryKey: ['caisseSpecialeDemandsStats'] })
      toast.success('Contrat supprimé')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Erreur lors de la suppression du contrat')
    },
  })
}

export function useReplaceContractPdf() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ contractId, file }: { contractId: string; file: File }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.replaceContractPdf(contractId, file, user.uid)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['caisse-contract', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['caisse-contracts'] })
      queryClient.invalidateQueries({ queryKey: ['caisse-contracts-stats'] })
      toast.success('Contrat remplacé avec succès')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Erreur lors du remplacement du contrat')
    },
  })
}
