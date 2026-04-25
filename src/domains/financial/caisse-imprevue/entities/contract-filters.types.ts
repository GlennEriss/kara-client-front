import type { CaisseImprevuePaymentFrequency, ContractCIStatus } from '@/types/types'

export interface ContractCIFilters {
  search?: string
  status?: ContractCIStatus | 'all'
  paymentFrequency?: CaisseImprevuePaymentFrequency | 'all'
  subscriptionCIID?: string
  createdAtFrom?: Date
  createdAtTo?: Date
  nextDueAtFrom?: Date
  nextDueAtTo?: Date
  overdueOnly?: boolean
  monthlyAmountMin?: number
  monthlyAmountMax?: number
  contractAmountMin?: number
  contractAmountMax?: number
  paidAmountMin?: number
  paidAmountMax?: number
  durationMonthsMin?: number
  durationMonthsMax?: number
  supportRemainingAmountMin?: number
  supportRemainingAmountMax?: number
  supportRepaidAmountMin?: number
  supportRepaidAmountMax?: number
  supportCountMin?: number
  supportCountMax?: number
  paymentCountMin?: number
  paymentCountMax?: number
}

export interface ContractCIStats {
  total: number
  active: number
  finished: number
  canceled: number
  totalAmount: number
  activePercentage: number
  finishedPercentage: number
  canceledPercentage: number
}
