import type { MyGroupAgreement } from './agreement'

export type ProjectKind = 'TONTINE' | 'PURCHASE' | 'OTHER'
export type ProjectStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
export type ContributionFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export const PROJECT_KINDS: Record<ProjectKind, string> = {
  TONTINE: 'Caisse collective',
  PURCHASE: 'Achat collectif',
  OTHER: 'Autre projet',
}
export const PROJECT_STATUSES: Record<ProjectStatus, string> = {
  PLANNED: 'En préparation',
  ACTIVE: 'En cours',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
}

export type GroupParticipant = { id: string; name: string; isMe: boolean }
export type MyProjectCredit = {
  id: string
  status: string
  amount: number
  amountPaid: number
  amountRemaining: number
  totalAmount?: number
  nextDueAt?: string
  contributionId?: string
}
export type MyProjectCreditDemand = {
  id: string
  status: string
  amount: number
  contributionId?: string
}
export type MyGroupContribution = {
  period: string
  dueDate: string
  amount: number
  paidAmount: number
  remaining: number
  status: 'DUE' | 'PARTIAL' | 'PAID' | 'PENDING_SUPPORT' | 'SUPPORTED'
  payments: { amount: number; date: string; kind: 'DIRECT' | 'SUPPORT' }[]
  support?: Omit<MyProjectCredit, 'id' | 'contributionId'>
}
export type MemberProject = {
  id: string
  name: string
  kind: ProjectKind
  status: ProjectStatus
  description: string
  estimatedBudget?: number
  targetDate?: string
  participants: GroupParticipant[]
  isParticipant: boolean
  payoutOrder?: {
    participants: GroupParticipant[]
    drawnAt?: string
  }
  payoutOrderNeedsRedraw?: boolean
  myCredits?: MyProjectCredit[]
  myCreditDemands?: MyProjectCreditDemand[]
  myContributions?: MyGroupContribution[]
  contributionFrequency?: ContributionFrequency
  payoutFee?: { enabled: boolean; amount: number }
  myPayouts?: {
    period: string
    frequency?: ContributionFrequency
    date: string
    grossAmount: number
    feeAmount: number
    netAmount: number
  }[]
}

export type MemberGroupSummary = {
  id: string
  name: string
  label?: string
  description: string
  coordinatorName?: string
  guarantorName?: string
  memberCount: number
  projectCount: number
  openProjectCount: number
  myProjectCount: number
}

export type MemberGroupDetail = MemberGroupSummary & {
  members: (GroupParticipant & { isCoordinator: boolean })[]
  projects: MemberProject[]
  agreements?: MyGroupAgreement[]
}
