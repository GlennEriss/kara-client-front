import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useAuditLogger } from '@/hooks/useAuditLog'
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
  const { log } = useAuditLogger()
  return useMutation({
    mutationFn: (input: CreateCaisseContractInput) => service.createContract(input),
    onSuccess: (contractId) => {
      qc.invalidateQueries({ queryKey: ['caisse-contracts'] })
      qc.invalidateQueries({ queryKey: ['caisse-contracts-stats'] })
      log({ action: 'create', module: 'caisseSpeciale', moduleLabel: 'Caisse Spéciale', targetType: 'contrat', targetId: typeof contractId === 'string' ? contractId : undefined, description: 'Création d\'un contrat de caisse spéciale' })
    },
  })
}

export function useUploadContractPdf() {
  const qc = useQueryClient()
  const { log } = useAuditLogger()
  return useMutation<ContractPdfMetadata, Error, UploadContractPdfInput>({
    mutationFn: (input) => service.uploadContractPdf(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['caisse-contract', variables.contractId] })
      qc.invalidateQueries({ queryKey: ['caisse-contracts'] })
      log({ action: 'update', module: 'caisseSpeciale', moduleLabel: 'Caisse Spéciale', targetType: 'contrat', targetId: variables.contractId, description: 'Téléversement du PDF d\'un contrat de caisse spéciale' })
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
  const { log } = useAuditLogger()

  return useMutation({
    mutationFn: (contractId: string) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.deleteCaisseContract(contractId, user.uid)
    },
    onSuccess: (_result, contractId) => {
      queryClient.invalidateQueries({ queryKey: ['caisse-contracts'] })
      queryClient.invalidateQueries({ queryKey: ['caisse-contracts-stats'] })
      queryClient.invalidateQueries({ queryKey: ['caisse-contract'] })
      queryClient.invalidateQueries({ queryKey: ['caisseSpecialeDemands'] })
      queryClient.invalidateQueries({ queryKey: ['caisseSpecialeDemandsStats'] })
      log({ action: 'delete', module: 'caisseSpeciale', moduleLabel: 'Caisse Spéciale', targetType: 'contrat', targetId: contractId, description: 'Suppression d\'un contrat de caisse spéciale (et de sa demande liée)' })
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
  const { log } = useAuditLogger()

  return useMutation({
    mutationFn: ({ contractId, file }: { contractId: string; file: File }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.replaceContractPdf(contractId, file, user.uid)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['caisse-contract', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['caisse-contracts'] })
      queryClient.invalidateQueries({ queryKey: ['caisse-contracts-stats'] })
      log({ action: 'update', module: 'caisseSpeciale', moduleLabel: 'Caisse Spéciale', targetType: 'contrat', targetId: variables.contractId, description: 'Remplacement du PDF d\'un contrat de caisse spéciale' })
      toast.success('Contrat remplacé avec succès')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Erreur lors du remplacement du contrat')
    },
  })
}

/** Indique si la suppression d’un versement est autorisée pour ce contrat (statut actif, pas clos/remboursement). */
export function canDeletePayment(contract: { status?: string } | null): boolean {
  return service.canDeletePayment(contract as any)
}

export function useDeleteContractPayment() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { log } = useAuditLogger()

  return useMutation({
    mutationFn: ({
      contractId,
      paymentId,
      contributionId,
    }: {
      contractId: string
      paymentId: string
      contributionId?: string
    }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.deleteContractPayment(contractId, paymentId, user.uid, contributionId)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['caisse-contract', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['caisse-contract-payments', variables.contractId] })
      queryClient.invalidateQueries({ queryKey: ['caisse-contracts'] })
      queryClient.invalidateQueries({ queryKey: ['caisse-contracts-stats'] })
      log({ action: 'delete', module: 'caisseSpeciale', moduleLabel: 'Caisse Spéciale', targetType: 'versement', targetId: variables.contractId, description: 'Suppression d\'un versement de caisse spéciale' })
      toast.success('Versement supprimé. Les totaux du contrat ont été recalculés.')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Erreur lors de la suppression du versement')
    },
  })
}
