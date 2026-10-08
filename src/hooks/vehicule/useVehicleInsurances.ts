'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { VehicleDeclarationCorrection, VehicleInsurance, VehicleInsuranceFilters, VehicleInsuranceListResult } from '@/types/types'
import { summarizeCorrections } from '@/utils/vehicle-declaration'
import { useAuth } from '@/hooks/useAuth'
import { VehicleInsuranceFormValues } from '@/schemas/vehicule.schema'
import { openCurrentRewardPeriod } from './useVehicleRewards'

const getService = () => ServiceFactory.getVehicleInsuranceService()

/**
 * Ouvre le reversement de la période en cours. Un échec ne bloque pas la
 * validation : la fiche propose alors de l'ouvrir à la main.
 */
async function openRewardSafely(insuranceId: string, adminId: string) {
  try {
    const insurance = await getService().getById(insuranceId)
    return insurance ? await openCurrentRewardPeriod(insurance, adminId) : null
  } catch (error) {
    console.error('[vehicule] ouverture du reversement impossible:', error)
    return null
  }
}

export function useVehicleInsuranceList(filters?: VehicleInsuranceFilters, page: number = 1, pageSize: number = 12) {
  return useQuery<VehicleInsuranceListResult>({
    queryKey: ['vehicle-insurances', 'list', filters, page, pageSize],
    queryFn: () => getService().list(filters, page, pageSize),
    staleTime: 1000 * 60 * 5,
  })
}

export function useVehicleInsuranceStats() {
  return useQuery({
    queryKey: ['vehicle-insurances', 'stats'],
    queryFn: () => getService().getStats(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useVehicleInsurance(id?: string) {
  return useQuery<VehicleInsurance | null>({
    queryKey: ['vehicle-insurances', id],
    queryFn: () => getService().getById(id as string),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateVehicleInsurance() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (payload: VehicleInsuranceFormValues) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return getService().createInsurance(payload, user.uid).then(async (id) => {
        // Saisie admin = assurance validée : on ouvre son reversement.
        await openRewardSafely(id, user.uid)
        return id
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-rewards'] })
    },
  })
}

export function useUpdateVehicleInsurance() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<VehicleInsuranceFormValues> }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return getService().updateInsurance(id, updates, user.uid)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances', 'list'] })
    },
  })
}

export function useRenewVehicleInsurance() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ id, startDate, endDate, premiumAmount, policyNumber }: { id: string; startDate: Date; endDate: Date; premiumAmount: number; policyNumber?: string }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return getService()
        .renewInsurance(id, { startDate, endDate, premiumAmount, policyNumber }, user.uid)
        // Nouvelle période d'assurance : nouveau reversement.
        .then(() => openRewardSafely(id, user.uid))
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances', 'stats'] })
    },
  })
}

export function useDeleteVehicleInsurance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => getService().deleteInsurance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances'] })
    },
  })
}

export function useMarkVehicleInsuranceExpired() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (id: string) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return getService().markExpired(id, user.uid)
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances', id] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances', 'stats'] })
    },
  })
}


/** Prévient le membre de la décision sur sa déclaration (best-effort : ne bloque pas la décision). */
async function notifyMemberOfDeclaration(insurance: VehicleInsurance, decision: 'validated' | 'rejected', reason?: string) {
  const recipientId = insurance.memberMatricule || insurance.memberId
  if (!recipientId) return
  const vehicle = [insurance.vehicleBrand, insurance.vehicleModel].filter(Boolean).join(' ') || 'votre véhicule'
  const plate = insurance.plateNumber ? ` (${insurance.plateNumber})` : ''
  await ServiceFactory.getNotificationService().notifyMember({
    recipientId,
    module: 'vehicule',
    entityId: insurance.id,
    type: 'status_update',
    title: decision === 'validated' ? 'Véhicule validé' : 'Déclaration de véhicule refusée',
    message:
      decision === 'validated'
        ? `L'assurance de ${vehicle}${plate} a été vérifiée et validée par l'association.${
            insurance.declarationCorrections?.length
              ? ` Informations corrigées d'après l'assureur partenaire : ${summarizeCorrections(insurance.declarationCorrections)}.`
              : ''
          }`
        : `La déclaration de ${vehicle}${plate} n'a pas été validée${reason ? ` : ${reason}` : ''}. Corrigez-la puis envoyez-la à nouveau.`,
    metadata: { insuranceId: insurance.id, declarationStatus: decision },
  })
}

/** Valide une déclaration de membre après vérification chez l'assureur partenaire. */
export function useValidateVehicleDeclaration() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, corrections = [] }: { id: string; corrections?: VehicleDeclarationCorrection[] }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      const insurance = await getService().validateDeclaration(id, user.uid, corrections)
      await notifyMemberOfDeclaration(insurance, 'validated')
      const reward = await openRewardSafely(id, user.uid)
      return { insurance, reward }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-rewards'] })
    },
  })
}

/** Refuse une déclaration de membre avec un motif. */
export function useRejectVehicleDeclaration() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      const insurance = await getService().rejectDeclaration(id, reason, user.uid)
      await notifyMemberOfDeclaration(insurance, 'rejected', reason.trim())
      return insurance
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-insurances'] })
    },
  })
}
