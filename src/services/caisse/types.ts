export type CaisseType = 'STANDARD' | 'JOURNALIERE' | 'LIBRE'
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
  status: CaissePaymentStatus
  proofUrl?: string
  createdAt: Date
  // Extensions pour journalière/libre
  accumulatedAmount?: number
  contribs?: Array<{ amount: number; paidAt: Date; proofUrl?: string }>
  targetAmount?: number
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

