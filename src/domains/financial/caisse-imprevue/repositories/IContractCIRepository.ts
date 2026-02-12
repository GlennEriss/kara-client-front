import type { ContractCI } from '@/types/types'
import type { ContractCIFilters, ContractCIStats } from '../entities/contract-filters.types'

export interface IContractCIRepository {
  getContractsWithFilters(filters?: ContractCIFilters): Promise<ContractCI[]>
  getContractsStats(filters?: ContractCIFilters): Promise<ContractCIStats>
}
