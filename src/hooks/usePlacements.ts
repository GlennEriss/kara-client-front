import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import type { Placement, CommissionPaymentPlacement, EarlyExitPlacement } from '@/types/types'

export function usePlacements() {
  const service = ServiceFactory.getPlacementService()
  return useQuery<Placement[]>({
    queryKey: ['placements'],
    queryFn: () => service.listPlacements(),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['placements'] })
    },
  })

  const update = useMutation({
    mutationFn: ({ id, data, adminId }: { id: string; data: Partial<Placement>; adminId: string }) =>
      service.updatePlacement(id, data, adminId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['placements'] })
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => service.deletePlacement(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['placements'] })
    },
  })

  const requestEarlyExit = useMutation({
    mutationFn: ({ placementId, commissionDue, payoutAmount, reason, documentPdf, benefactorId, adminId }: { 
      placementId: string
      commissionDue: number
      payoutAmount: number
      reason?: string
      documentPdf?: File
      benefactorId: string
      adminId: string 
    }) =>
      service.requestEarlyExit(placementId, { commissionDue, payoutAmount }, adminId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['placements'] })
      qc.invalidateQueries({ queryKey: ['placement', variables.placementId] })
      qc.invalidateQueries({ queryKey: ['placement', variables.placementId, 'early-exit'] })
    },
  })

  const payCommission = useMutation({
    mutationFn: ({ placementId, commissionId, data, adminId }: { placementId: string; commissionId: string; data: Partial<CommissionPaymentPlacement>; adminId: string }) =>
      service.payCommission(placementId, commissionId, data, adminId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['placements'] })
      qc.invalidateQueries({ queryKey: ['placement', variables.placementId, 'commissions'] })
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
 * Hook pour calculer automatiquement les montants de retrait anticipé
 */
export function useCalculateEarlyExit(placementId: string | null | undefined) {
  const service = ServiceFactory.getPlacementService()
  return useQuery({
    queryKey: ['calculateEarlyExit', placementId],
    queryFn: () => (placementId ? service.calculateEarlyExitAmounts(placementId) : Promise.resolve({ commissionDue: 0, payoutAmount: 0 })),
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

