import type { PaymentMode } from "@/types/types"

export type CaisseType =
  | 'STANDARD'
  | 'JOURNALIERE'
  | 'LIBRE'
  | 'STANDARD_CHARITABLE'
  | 'JOURNALIERE_CHARITABLE'
  | 'LIBRE_CHARITABLE'
export type CaisseContractStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'LATE_NO_PENALTY'
  | 'LATE_WITH_PENALTY'
  | 'DEFAULTED_AFTER_J12'
  | 'EARLY_WITHDRAW_REQUESTED'
  | 'FINAL_REFUND_PENDING'
  | 'EARLY_REFUND_PENDING'
  | 'RESCINDED'
  | 'CLOSED'

export type CaissePaymentStatus = 'DUE' | 'PAID' | 'REFUSED'

export type CaisseRefundType = 'FINAL' | 'EARLY' | 'DEFAULT'
export type CaisseRefundStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'ARCHIVED'

export interface CaisseSettings {
  id: string
  effectiveAt: Date
  isActive: boolean
  bonusTable: Record<string, number>
  penaltyRules: any
  businessTexts?: Record<string, string>
  caisseType?: CaisseType
}

export interface CaisseContract {
  id: string
  // Champs pour identifier le type de contrat
  memberId?: string        // Pour les contrats individuels
  groupeId?: string        // Pour les contrats de groupe
  contractType: 'INDIVIDUAL' | 'GROUP'  // Type explicite du contrat
  
  monthlyAmount: number
  monthsPlanned: number
  createdAt: Date
  contractStartAt?: Date
  contractEndAt?: Date
  status: CaisseContractStatus
  nextDueAt?: Date
  currentMonthIndex: number
  withdrawLockedUntilM: number
  nominalPaid: number
  bonusAccrued: number
  penaltiesTotal: number
  settingsVersion: string
  caisseType: CaisseType
  updatedAt?: Date
  updatedBy?: string
}

export interface CaissePayment {
  id: string
  dueMonthIndex: number
  dueAt: Date
  paidAt?: Date
  amount: number
  penaltyApplied?: number
  penaltyDays?: number // Nombre de jours de retard
  status: CaissePaymentStatus
  proofUrl?: string
  createdAt: Date
  updatedAt?: Date
  updatedBy?: string // ID de l'administrateur qui a traité le paiement
  // Informations de paiement
  time?: string
  mode?: PaymentMode
  // Extensions pour journalière/libre
  accumulatedAmount?: number
  contribs?: IndividualPaymentContribution[]
  targetAmount?: number
  
  // Extensions pour les contrats de groupe
  isGroupPayment?: boolean
  groupContributions?: GroupPaymentContribution[]

  // Agent de recouvrement ayant collecté le paiement (contrats individuels)
  agentRecouvrementId?: string
}

export interface GroupPaymentContribution {
  id: string
  memberId: string
  memberName: string
  memberMatricule: string
  // Informations complètes du payeur
  memberFirstName: string
  memberLastName: string
  memberPhotoURL?: string
  memberContacts?: string[]
  amount: number
  time: string
  mode: PaymentMode
  proofUrl?: string
  penalty?: number // Montant de la pénalité pour cette contribution
  penaltyDays?: number // Nombre de jours de retard pour cette contribution
  agentRecouvrementId?: string // ID de l'agent ayant collecté la contribution
  createdAt: Date
  updatedAt?: Date
}

// Type pour les contributions individuelles (contrats individuels)
export interface IndividualPaymentContribution {
  id: string
  amount: number
  paidAt: Date
  proofUrl?: string
  time?: string
  mode?: PaymentMode
  memberId?: string
  memberName?: string
  memberPhotoURL?: string
  penalty?: number // Montant de la pénalité pour cette contribution
  penaltyDays?: number // Nombre de jours de retard pour cette contribution
  agentRecouvrementId?: string // ID de l'agent ayant collecté la contribution
}

export interface CaisseRefund {
  id: string
  type: CaisseRefundType
  amountNominal: number
  amountBonus: number
  deadlineAt: Date
  status: CaisseRefundStatus
  createdAt: Date
  processedAt?: Date
  proofUrl?: string
  // Nouveaux champs pour le retrait anticipé
  reason?: string
  withdrawalDate?: Date
  withdrawalTime?: string
}
