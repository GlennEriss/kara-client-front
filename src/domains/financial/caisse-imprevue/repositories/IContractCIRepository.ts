import type { ContractCI } from '@/types/types'
import type { ContractCIFilters, ContractCIStats } from '../entities/contract-filters.types'

export interface IContractCIRepository {
  getContractsWithFilters(filters?: ContractCIFilters, options?: { throwOnError?: boolean }): Promise<ContractCI[]>
  getContractsStats(filters?: ContractCIFilters): Promise<ContractCIStats>
}
