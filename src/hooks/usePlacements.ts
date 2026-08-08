import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PLACEMENT_AUDIT_MODULE } from '@/constantes/audit-modules'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useAuditLogger } from '@/hooks/useAuditLog'
import type { Placement, CommissionPaymentPlacement, EarlyExitPlacement } from '@/types/types'

export type PlacementListFilter = {
  statuses?: Placement['status'][]
  payoutMode?: Placement['payoutMode']
}

export function usePlacements(filter: PlacementListFilter = {}) {
  const service = ServiceFactory.getPlacementService()
  return useQuery<Placement[]>({
    // La clé inclut le filtre serveur : chaque onglet a son propre cache.
    queryKey: ['placements', filter.statuses ?? null, filter.payoutMode ?? null],
    queryFn: () => service.listPlacements(filter),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function usePlacement(id?: string) {
  const service = ServiceFactory.getPlacementService()
  return useQuery<Placement | null>({
    queryKey: ['placement', id],
    queryFn: () => (id ? service.getPlacement(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePlacementMutations() {
  const qc = useQueryClient()
  const service = ServiceFactory.getPlacementService()
  const { log } = useAuditLogger()

  const create = useMutation({
    mutationFn: (data: Omit<Placement, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { adminId: string }) => {
      const { adminId, ...rest } = data
      return service.createPlacement(
        {
          ...rest,
          createdBy: adminId,
          updatedBy: adminId,
        },
        adminId
      )
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['placements'] })
      log({
        action: 'create', ...PLACEMENT_AUDIT_MODULE, targetType: 'placement', targetId: result?.id,
        description: `Création d'un placement${result?.benefactorName ? ` — ${result.benefactorName}` : ''}`,
      })
    },
  })

  const update = useMutation({
    mutationFn: ({ id, data, adminId }: { id: string; data: Partial<Placement>; adminId: string }) =>
      service.updatePlacement(id, data, adminId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['placements'] })
      log({ action: 'update', ...PLACEMENT_AUDIT_MODULE, targetType: 'placement', targetId: variables.id, description: 'Modification d\'un placement' })
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => service.deletePlacement(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['placements'] })
      log({ action: 'delete', ...PLACEMENT_AUDIT_MODULE, targetType: 'placement', targetId: id, description: 'Suppression d\'un placement' })
    },
  })

  const requestEarlyExit = useMutation({
    mutationFn: ({
      placementId,
      commissionDue,
      payoutAmount,
      reason,
      withdrawalAmount,
      withdrawalDate,
      withdrawalTime,
      withdrawalProof,
      documentPdf,
      paymentMode,
      withFees,
      paymentMethodOther,
      paymentDate,
      benefactorId,
      adminId,
    }: {
      placementId: string
      commissionDue: number
      payoutAmount: number
      reason?: string
      withdrawalAmount?: number
      withdrawalDate?: string
      withdrawalTime?: string
      withdrawalProof?: File
      documentPdf?: File
      paymentMode?: 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer' | 'other'
      withFees?: boolean
      paymentMethodOther?: string
      paymentDate?: Date
      benefactorId: string
      adminId: string 
    }) =>
      service.requestEarlyExit(
        placementId,
        {
          commissionDue,
          payoutAmount,
          reason,
          withdrawalAmount,
          withdrawalDate,
          withdrawalTime,
          withdrawalProof,
          documentPdf,
          paymentMode,
          withFees,
          paymentMethodOther,
          paymentDate,
        },
        benefactorId,
        adminId
      ),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['placements'] })
      qc.invalidateQueries({ queryKey: ['placement', variables.placementId] })
      qc.invalidateQueries({ queryKey: ['placement', variables.placementId, 'early-exit'] })
      log({ action: 'other', ...PLACEMENT_AUDIT_MODULE, targetType: 'placement', targetId: variables.placementId, description: 'Demande de sortie anticipée d\'un placement' })
    },
  })

  const payCommission = useMutation({
    mutationFn: ({ placementId, commissionId, data, adminId }: { placementId: string; commissionId: string; data: Partial<CommissionPaymentPlacement>; adminId: string }) =>
      service.payCommission(placementId, commissionId, data, adminId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['placements'] })
      qc.invalidateQueries({ queryKey: ['placement', variables.placementId, 'commissions'] })
      // `targetId` = la commission, pas le placement : sans ça on ne peut pas
      // remonter à l'échéance concernée depuis le journal.
      log({ action: 'payment', ...PLACEMENT_AUDIT_MODULE, targetType: 'commission', targetId: variables.commissionId, description: 'Paiement d\'une commission de placement', metadata: { placementId: variables.placementId } })
    },
  })

  return { create, update, remove, requestEarlyExit, payCommission }
}

export function usePlacementCommissions(placementId?: string) {
  const service = ServiceFactory.getPlacementService()
  return useQuery<CommissionPaymentPlacement[]>({
    queryKey: ['placement', placementId, 'commissions'],
    queryFn: () => (placementId ? service.listCommissions(placementId) : Promise.resolve([])),
    enabled: !!placementId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useEarlyExit(placementId?: string) {
  const service = ServiceFactory.getPlacementService()
  return useQuery<EarlyExitPlacement | null>({
    queryKey: ['placement', placementId, 'early-exit'],
    queryFn: () => (placementId ? service.getEarlyExit(placementId) : Promise.resolve(null)),
    enabled: !!placementId,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePlacementDocumentMutations() {
  const qc = useQueryClient()
  const service = ServiceFactory.getPlacementService()

  const uploadContract = useMutation({
    mutationFn: ({ file, placementId, benefactorId, adminId }: { file: File; placementId: string; benefactorId: string; adminId: string }) =>
      service.uploadPlacementDocument(file, placementId, benefactorId, 'PLACEMENT_CONTRACT', adminId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['placement', variables.placementId] })
      qc.invalidateQueries({ queryKey: ['placements'] })
    },
  })

  const uploadEarlyExitQuittance = useMutation({
    mutationFn: ({ file, placementId, benefactorId, adminId }: { file: File; placementId: string; benefactorId: string; adminId: string }) =>
      service.uploadEarlyExitQuittance(file, placementId, benefactorId, adminId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['placement', variables.placementId, 'early-exit'] })
      qc.invalidateQueries({ queryKey: ['placement', variables.placementId] })
      qc.invalidateQueries({ queryKey: ['placements'] })
    },
  })

  return { uploadContract, uploadEarlyExitQuittance }
}

/**
 * Hook pour calculer automatiquement les montants de retrait anticipé.
 *
 * `effectiveDate` doit être la date de retrait réellement saisie : le service
 * recalcule sur cette date au moment de l'enregistrement, donc calculer ici sur
 * `new Date()` afficherait une commission différente de celle qui sera persistée
 * dès que la saisie franchit un anniversaire mensuel (antidatage compris).
 */
export function useCalculateEarlyExit(
  placementId: string | null | undefined,
  effectiveDate?: Date | null,
) {
  const service = ServiceFactory.getPlacementService()
  // La commission ne dépend que du jour calendaire : clé stable à la journée
  // pour éviter un refetch à chaque rendu.
  const effectiveDay = effectiveDate && !Number.isNaN(effectiveDate.getTime())
    ? effectiveDate.toISOString().slice(0, 10)
    : null

  return useQuery({
    queryKey: ['calculateEarlyExit', placementId, effectiveDay],
    queryFn: () => (placementId
      ? service.calculateEarlyExitAmounts(placementId, effectiveDate ?? undefined)
      : Promise.resolve({ commissionDue: 0, payoutAmount: 0 })),
    enabled: !!placementId,
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Hook pour récupérer les statistiques complètes des placements
 */
export function usePlacementStats() {
  const service = ServiceFactory.getPlacementService()
  return useQuery({
    queryKey: ['placementStats'],
    queryFn: () => service.getPlacementStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
