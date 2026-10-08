'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { createFile } from '@/db/upload-image.db'
import {
  deleteInsurancePartner,
  listInsurancePartners,
  listRewardsForInsurance,
  listVehicleRewards,
  openRewardForPeriod,
  recordMemberPayment,
  recordPartnerReceipt,
  saveInsurancePartner,
} from '@/db/vehicle-rewards.db'
import type { PaymentMode, VehicleInsurance, VehicleInsurancePartner, VehicleInsuranceReward } from '@/types/types'

const KEYS = {
  partners: ['vehicle-rewards', 'partners'] as const,
  all: ['vehicle-rewards', 'list'] as const,
  forInsurance: (id: string) => ['vehicle-rewards', 'insurance', id] as const,
}

export function useInsurancePartners() {
  return useQuery({ queryKey: KEYS.partners, queryFn: listInsurancePartners, staleTime: 5 * 60 * 1000 })
}

export function useInsurancePartnerMutations() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEYS.partners })
  const save = useMutation({
    mutationFn: (partner: Omit<VehicleInsurancePartner, 'id' | 'updatedAt' | 'updatedBy'> & { id?: string }) =>
      saveInsurancePartner(partner, user?.uid || 'admin'),
    onSuccess: invalidate,
  })
  const remove = useMutation({ mutationFn: (id: string) => deleteInsurancePartner(id), onSuccess: invalidate })
  return { save, remove }
}

export function useVehicleRewards() {
  return useQuery({ queryKey: KEYS.all, queryFn: listVehicleRewards, staleTime: 60 * 1000 })
}

export function useInsuranceRewards(insuranceId?: string) {
  return useQuery({
    queryKey: KEYS.forInsurance(insuranceId ?? ''),
    queryFn: () => listRewardsForInsurance(insuranceId as string),
    enabled: !!insuranceId,
  })
}

/**
 * Ouvre le reversement de la période en cours d'une assurance validée
 * (période 0 à la validation, puis numéro du renouvellement).
 */
export async function openCurrentRewardPeriod(insurance: VehicleInsurance, adminId: string) {
  return openRewardForPeriod(insurance, insurance.renewalCount || 0, adminId)
}

export function useVehicleRewardMutations() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const admin = { id: user?.uid || 'admin', name: user?.displayName || undefined }
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['vehicle-rewards'] })

  const openPeriod = useMutation({
    mutationFn: (insurance: VehicleInsurance) => openCurrentRewardPeriod(insurance, admin.id),
    onSuccess: invalidate,
  })

  const partnerReceipt = useMutation({
    mutationFn: ({
      reward,
      ...data
    }: {
      reward: VehicleInsuranceReward
      amount: number
      receivedAt: Date
      memberSharePercent: number
      reference?: string
    }) => recordPartnerReceipt(reward, data, admin),
    onSuccess: invalidate,
  })

  const memberPayment = useMutation({
    mutationFn: async ({
      reward,
      proofFile,
      ...data
    }: {
      reward: VehicleInsuranceReward
      paidAt: Date
      mode: PaymentMode
      reference?: string
      proofFile?: File
    }) => {
      const proof = proofFile ? await createFile(proofFile, reward.beneficiaryId, 'payment-proofs') : undefined
      await recordMemberPayment(reward, { ...data, proofUrl: proof?.url, proofPath: proof?.path }, admin)
      // Le membre est prévenu (best-effort : le versement reste enregistré).
      try {
        await ServiceFactory.getNotificationService().notifyMember({
          recipientId: reward.beneficiaryMatricule || reward.beneficiaryId,
          module: 'vehicule',
          entityId: reward.insuranceId,
          type: 'status_update',
          title: 'Reversement assurance versé',
          message: `LE KARA vous a versé ${reward.memberAmount.toLocaleString('fr-FR')} FCFA pour l'assurance du véhicule ${reward.plateNumber || ''}`.trim() + '.',
          metadata: { rewardId: reward.id, insuranceId: reward.insuranceId, amount: reward.memberAmount },
        })
      } catch {
        // Notification non bloquante.
      }
    },
    onSuccess: invalidate,
  })

  return { openPeriod, partnerReceipt, memberPayment }
}
