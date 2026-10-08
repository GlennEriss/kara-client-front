import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import type {
  PaymentMode,
  VehicleInsurance,
  VehicleInsurancePartner,
  VehicleInsuranceReward,
  VehicleRewardStatus,
} from '@/types/types'
import { computeVehicleReward, findInsurancePartner, memberShareOf, resolveRewardBeneficiary } from '@/utils/vehicle-rewards'

const PARTNERS = firebaseCollectionNames.vehicleInsurancePartners
const REWARDS = firebaseCollectionNames.vehicleInsuranceRewards

const toDate = (v: any): Date | undefined => (v?.toDate ? v.toDate() : v ? new Date(v) : undefined)

/** Firestore refuse les `undefined`, y compris imbriqués. */
function clean<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clean) as T
  if (value && typeof value === 'object' && !(value instanceof Date) && !('_methodName' in (value as object))) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = clean(v)
    }
    return out as T
  }
  return value
}

// ==================== Assureurs partenaires ====================

export async function listInsurancePartners(): Promise<VehicleInsurancePartner[]> {
  const snap = await getDocs(collection(db, PARTNERS))
  return snap.docs
    .map((d) => {
      const data = d.data()
      return {
        id: d.id,
        name: data.name ?? '',
        commissionRate: Number(data.commissionRate) || 0,
        memberSharePercent: Number(data.memberSharePercent) || 0,
        updatedAt: toDate(data.updatedAt),
        updatedBy: data.updatedBy ?? '',
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

export async function saveInsurancePartner(
  partner: Omit<VehicleInsurancePartner, 'id' | 'updatedAt' | 'updatedBy'> & { id?: string },
  adminId: string,
): Promise<void> {
  const id = partner.id || doc(collection(db, PARTNERS)).id
  await setDoc(doc(db, PARTNERS, id), {
    name: partner.name.trim(),
    commissionRate: partner.commissionRate,
    memberSharePercent: partner.memberSharePercent,
    updatedAt: serverTimestamp(),
    updatedBy: adminId,
  })
}

export async function deleteInsurancePartner(id: string): Promise<void> {
  await deleteDoc(doc(db, PARTNERS, id))
}

// ==================== Reversements ====================

function mapReward(id: string, data: any): VehicleInsuranceReward {
  return {
    id,
    insuranceId: data.insuranceId ?? '',
    periodIndex: Number(data.periodIndex) || 0,
    plateNumber: data.plateNumber ?? '',
    vehicleLabel: data.vehicleLabel ?? '',
    insuranceCompany: data.insuranceCompany ?? '',
    startDate: toDate(data.startDate) ?? new Date(0),
    endDate: toDate(data.endDate) ?? new Date(0),
    premiumAmount: Number(data.premiumAmount) || 0,
    beneficiaryId: data.beneficiaryId ?? '',
    beneficiaryMatricule: data.beneficiaryMatricule ?? '',
    beneficiaryName: data.beneficiaryName ?? '',
    commissionRate: Number(data.commissionRate) || 0,
    memberSharePercent: Number(data.memberSharePercent) || 0,
    expectedCommission: Number(data.expectedCommission) || 0,
    memberAmount: Number(data.memberAmount) || 0,
    status: (data.status as VehicleRewardStatus) ?? 'AWAITING_PARTNER',
    partnerReceipt: data.partnerReceipt
      ? { ...data.partnerReceipt, receivedAt: toDate(data.partnerReceipt.receivedAt) ?? new Date(0) }
      : undefined,
    memberPayment: data.memberPayment
      ? { ...data.memberPayment, paidAt: toDate(data.memberPayment.paidAt) ?? new Date(0) }
      : undefined,
    createdAt: toDate(data.createdAt),
    createdBy: data.createdBy ?? '',
  }
}

const byPeriod = (a: VehicleInsuranceReward, b: VehicleInsuranceReward) =>
  b.startDate.getTime() - a.startDate.getTime()

export async function listVehicleRewards(): Promise<VehicleInsuranceReward[]> {
  const snap = await getDocs(collection(db, REWARDS))
  return snap.docs.map((d) => mapReward(d.id, d.data())).sort(byPeriod)
}

export async function listRewardsForInsurance(insuranceId: string): Promise<VehicleInsuranceReward[]> {
  const snap = await getDocs(query(collection(db, REWARDS), where('insuranceId', '==', insuranceId)))
  return snap.docs.map((d) => mapReward(d.id, d.data())).sort(byPeriod)
}

/**
 * Ouvre le reversement d'une période d'assurance (validation ou
 * renouvellement). Sans effet si la période existe déjà : un reversement
 * versé ne doit jamais être écrasé.
 */
export async function openRewardForPeriod(
  insurance: VehicleInsurance,
  periodIndex: number,
  adminId: string,
): Promise<VehicleInsuranceReward | null> {
  const beneficiary = resolveRewardBeneficiary(insurance)
  if (!beneficiary) return null

  const id = `${insurance.id}_P${periodIndex}`
  const ref = doc(db, REWARDS, id)
  const existing = await getDoc(ref)
  if (existing.exists()) return mapReward(id, existing.data())

  const partner = findInsurancePartner(await listInsurancePartners(), insurance.insuranceCompany)
  const rates = { commissionRate: partner?.commissionRate ?? 0, memberSharePercent: partner?.memberSharePercent ?? 0 }
  const { expectedCommission, memberAmount } = computeVehicleReward(insurance.premiumAmount, rates)

  const data = clean({
    insuranceId: insurance.id,
    periodIndex,
    plateNumber: insurance.plateNumber,
    vehicleLabel: [insurance.vehicleBrand, insurance.vehicleModel].filter(Boolean).join(' ') || undefined,
    insuranceCompany: insurance.insuranceCompany,
    startDate: insurance.startDate,
    endDate: insurance.endDate,
    premiumAmount: Number(insurance.premiumAmount) || 0,
    beneficiaryId: beneficiary.id,
    beneficiaryMatricule: beneficiary.matricule,
    beneficiaryName: beneficiary.name,
    ...rates,
    expectedCommission,
    memberAmount,
    status: 'AWAITING_PARTNER' satisfies VehicleRewardStatus,
    createdAt: serverTimestamp(),
    createdBy: adminId,
  })
  await setDoc(ref, data)
  return mapReward(id, { ...data, createdAt: new Date() })
}

/** L'assureur a versé sa commission : la part du membre se calcule sur ce montant. */
export async function recordPartnerReceipt(
  reward: VehicleInsuranceReward,
  data: { amount: number; receivedAt: Date; memberSharePercent: number; reference?: string },
  admin: { id: string; name?: string },
): Promise<void> {
  if (reward.status === 'PAID') throw new Error('Ce reversement est déjà versé au membre')
  const amount = Math.round(Number(data.amount) || 0)
  if (amount <= 0) throw new Error('Indiquez le montant reçu de l’assureur')
  await updateDoc(
    doc(db, REWARDS, reward.id),
    clean({
      memberSharePercent: data.memberSharePercent,
      memberAmount: memberShareOf(amount, data.memberSharePercent),
      status: 'TO_PAY' satisfies VehicleRewardStatus,
      partnerReceipt: {
        amount,
        receivedAt: data.receivedAt,
        reference: data.reference?.trim() || undefined,
        recordedBy: admin.id,
        recordedByName: admin.name,
      },
    }),
  )
}

/** LE KARA a versé sa part au membre. */
export async function recordMemberPayment(
  reward: VehicleInsuranceReward,
  data: { paidAt: Date; mode: PaymentMode; reference?: string; proofUrl?: string; proofPath?: string },
  admin: { id: string; name?: string },
): Promise<void> {
  if (reward.status !== 'TO_PAY') {
    throw new Error(
      reward.status === 'PAID' ? 'Ce reversement est déjà versé' : "Enregistrez d'abord la commission reçue de l'assureur",
    )
  }
  await updateDoc(
    doc(db, REWARDS, reward.id),
    clean({
      status: 'PAID' satisfies VehicleRewardStatus,
      memberPayment: {
        paidAt: data.paidAt,
        mode: data.mode,
        reference: data.reference?.trim() || undefined,
        proofUrl: data.proofUrl,
        proofPath: data.proofPath,
        paidBy: admin.id,
        paidByName: admin.name,
      },
    }),
  )
}
