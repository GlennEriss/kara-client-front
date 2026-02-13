'use client'

import FiltersCI from '@/components/caisse-imprevue/FiltersCI'
import type { ContractCIFilters } from '../../../entities/contract-filters.types'

interface ContractsFiltersV2Props {
  filters: ContractCIFilters
  onFiltersChange: (filters: ContractCIFilters) => void
  onReset: () => void
  subscriptions?: Array<{ id: string; code: string; label?: string }>
  showPaymentFrequencyFilter?: boolean
}

export default function ContractsFiltersV2(props: ContractsFiltersV2Props) {
  return <FiltersCI {...props} />
}
