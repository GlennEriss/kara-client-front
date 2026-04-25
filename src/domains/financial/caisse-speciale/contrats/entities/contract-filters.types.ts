import type { CaisseContract } from '@/types/types'

export type ContractStatusFilter = CaisseContract['status'] | 'all'
export type ContractTypeFilter = 'INDIVIDUAL' | 'GROUP' | 'all'
export type CaisseTypeFilter =
  | 'STANDARD'
  | 'JOURNALIERE'
  | 'LIBRE'
  | 'STANDARD_CHARITABLE'
  | 'JOURNALIERE_CHARITABLE'
  | 'LIBRE_CHARITABLE'
  | 'all'

export type SpecificCaisseTypeFilter = Exclude<CaisseTypeFilter, 'all'>

export interface ContractFilters {
  status?: ContractStatusFilter
  contractType?: ContractTypeFilter
  caisseType?: CaisseTypeFilter
  caisseTypes?: SpecificCaisseTypeFilter[]
  memberId?: string
  groupeId?: string
  createdAtFrom?: Date
  createdAtTo?: Date
  nextDueAtFrom?: Date
  nextDueAtTo?: Date
  overdueOnly?: boolean
  search?: string
  monthlyAmountMin?: number
  monthlyAmountMax?: number
  contractAmountMin?: number
  contractAmountMax?: number
  bonusAmountMin?: number
  bonusAmountMax?: number
  penaltiesAmountMin?: number
  penaltiesAmountMax?: number
  paidAmountMin?: number
  paidAmountMax?: number
  durationMonthsMin?: number
  durationMonthsMax?: number
  paymentCountMin?: number
  paymentCountMax?: number
}

export interface PaginationParams {
  limit: number
  cursor?: string | null
}

export interface PaginatedContracts {
  items: CaisseContract[]
  total: number
  nextCursor: string | null
}

export interface ContractStats {
  total: number
  draft: number
  active: number
  late: number
  closed: number
  group: number
  individual: number
  byCaisseType: Record<string, number>
  /** Somme des nominalPaid de tous les contrats, tous statuts (pour la carte "Montant Total"). */
  totalPaidSum: number
}
