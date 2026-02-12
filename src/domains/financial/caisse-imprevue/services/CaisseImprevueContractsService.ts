import type { ContractCI } from '@/types/types'
import type { ContractCIFilters, ContractCIStats } from '../entities/contract-filters.types'
import { ContractCIRepository } from '../repositories/ContractCIRepository'
import type { IContractCIRepository } from '../repositories/IContractCIRepository'

export class CaisseImprevueContractsService {
  private static instance: CaisseImprevueContractsService
  private contractRepository: IContractCIRepository

  private constructor() {
    this.contractRepository = ContractCIRepository.getInstance()
  }

  static getInstance(): CaisseImprevueContractsService {
    if (!CaisseImprevueContractsService.instance) {
      CaisseImprevueContractsService.instance = new CaisseImprevueContractsService()
    }
    return CaisseImprevueContractsService.instance
  }

  async getContractsWithFilters(filters?: ContractCIFilters): Promise<ContractCI[]> {
    return this.contractRepository.getContractsWithFilters(filters)
  }

  async getContractsStats(filters?: ContractCIFilters): Promise<ContractCIStats> {
    return this.contractRepository.getContractsStats(filters)
  }
}
