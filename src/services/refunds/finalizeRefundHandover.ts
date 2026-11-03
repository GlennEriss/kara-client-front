import { getAdminById } from '@/db/admin.db'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import { auth } from '@/firebase/auth'
import { canFinalizeEarlyRefundAt, earlyRefundPayoutDueAt } from '@/utils/refund-payout'

export type RefundFund = 'CS' | 'CI'

export interface FinalizeRefundHandoverInput {
  fund: RefundFund
  contractId: string
  refundId: string
  adminId: string
  handoverDate: string
  handoverTime: string
  paymentMode: 'cash' | 'bank_transfer' | 'airtel_money' | 'mobicash' | 'other'
  paymentMethodOther?: string
  proofUrl: string
  proofPath: string
}

/**
 * Confirme la remise effective et clôture le contrat dans le même batch.
 * Un retrait anticipé peut être finalisé avant J+30, mais uniquement par un
 * superadmin. La date saisie représente la remise réelle, pas la validation.
 */
export async function finalizeRefundHandover(input: FinalizeRefundHandoverInput): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== input.adminId) {
    throw new Error('Session administrateur invalide')
  }
  const admin = await getAdminById(input.adminId)
  if (!admin) throw new Error('Compte administrateur introuvable')

  const { db, doc, getDoc, writeBatch, serverTimestamp } = await import('@/firebase/firestore') as any
  const refundCollection = input.fund === 'CS'
    ? `${firebaseCollectionNames.caisseContracts}/${input.contractId}/refunds`
    : `${firebaseCollectionNames.contractsCI}/${input.contractId}/earlyRefunds`
  const contractCollection = input.fund === 'CS'
    ? firebaseCollectionNames.caisseContracts
    : firebaseCollectionNames.contractsCI
  const refundRef = doc(db, refundCollection, input.refundId)
  const contractRef = doc(db, contractCollection, input.contractId)
  const refundSnapshot = await getDoc(refundRef)
  if (!refundSnapshot.exists()) throw new Error('Demande de remboursement introuvable')

  const refund = refundSnapshot.data() as Record<string, any>
  if (refund.status !== 'APPROVED') {
    throw new Error('Seule une demande approuvée peut être finalisée')
  }

  const paidAt = new Date(`${input.handoverDate}T${input.handoverTime}:00`)
  if (Number.isNaN(paidAt.getTime())) throw new Error('Date ou heure de remise invalide')
  if (paidAt.getTime() > Date.now() + 60_000) throw new Error('La date de remise ne peut pas être dans le futur')

  const isEarly = (refund.type || 'EARLY') === 'EARLY'
  const isSuperAdmin = admin.roles?.includes('SuperAdmin') === true
  if (isEarly && !canFinalizeEarlyRefundAt(refund, isSuperAdmin, paidAt)) {
    const dueAt = earlyRefundPayoutDueAt(refund)
    if (!dueAt) throw new Error('La date limite de remise est introuvable. Contactez un superadmin.')
    throw new Error('Seul un superadmin peut confirmer une remise avant la fin du délai de 30 jours')
  }

  const paidByName = `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || input.adminId
  const batch = writeBatch(db)
  batch.update(refundRef, {
    status: 'PAID',
    paidAt,
    paidAtTime: input.handoverTime,
    paidBy: input.adminId,
    paidByName,
    withdrawalDate: paidAt,
    withdrawalTime: input.handoverTime,
    withdrawalMode: input.paymentMode,
    ...(input.paymentMode === 'other' && input.paymentMethodOther?.trim()
      ? { paymentMethodOther: input.paymentMethodOther.trim() }
      : {}),
    paymentProofUrl: input.proofUrl,
    paymentProofPath: input.proofPath,
    proofUrl: input.proofUrl,
    proofPath: input.proofPath,
    finalizedAt: serverTimestamp(),
    finalizedBy: input.adminId,
    finalizedByName: paidByName,
    updatedAt: serverTimestamp(),
  })
  batch.update(contractRef, {
    status: input.fund === 'CS' ? 'CLOSED' : (isEarly ? 'CANCELED' : 'FINISHED'),
    closedAt: paidAt,
    closedBy: input.adminId,
    updatedAt: serverTimestamp(),
    updatedBy: input.adminId,
  })
  await batch.commit()
}
