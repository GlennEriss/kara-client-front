import { RepositoryFactory } from '@/factories/RepositoryFactory'
import type {
  IContractCIRepository as LegacyContractRepository,
  ContractsCIFilters as LegacyContractFilters,
} from '@/repositories/caisse-imprevu/IContractCIRepository'
import type { ContractCI } from '@/types/types'
import type { ContractCIFilters, ContractCIStats } from '../entities/contract-filters.types'
import type { IContractCIRepository } from './IContractCIRepository'

/**
 * Adaptateur domains vers le repository contrats CI existant.
 * Permet une migration progressive sans casser les appels legacy.
 */
export class ContractCIRepository implements IContractCIRepository {
  private static instance: ContractCIRepository
  private legacyRepository: LegacyContractRepository

  private constructor() {
    this.legacyRepository = RepositoryFactory.getContractCIRepository()
  }

  static getInstance(): ContractCIRepository {
    if (!ContractCIRepository.instance) {
      ContractCIRepository.instance = new ContractCIRepository()
    }
    return ContractCIRepository.instance
  }

  private toLegacyFilters(filters?: ContractCIFilters): LegacyContractFilters | undefined {
    if (!filters) return undefined
    return {
      search: filters.search,
      status: filters.status,
      paymentFrequency: filters.paymentFrequency,
      subscriptionCIID: filters.subscriptionCIID,
      overdueOnly: filters.overdueOnly,
    }
  }

  async getContractsWithFilters(filters?: ContractCIFilters): Promise<ContractCI[]> {
    return this.legacyRepository.getContractsWithFilters(this.toLegacyFilters(filters))
  }

  async getContractsStats(filters?: ContractCIFilters): Promise<ContractCIStats> {
    return this.legacyRepository.getContractsStats(this.toLegacyFilters(filters))
  }
}
