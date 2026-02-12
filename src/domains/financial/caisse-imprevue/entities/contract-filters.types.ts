import type { CaisseImprevuePaymentFrequency, ContractCIStatus } from '@/types/types'

export interface ContractCIFilters {
  search?: string
  status?: ContractCIStatus | 'all'
  paymentFrequency?: CaisseImprevuePaymentFrequency | 'all'
  subscriptionCIID?: string
  overdueOnly?: boolean
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
