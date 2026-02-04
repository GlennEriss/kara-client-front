import type { CaisseContract } from '@/types/types'
import { CaisseContractsRepository } from '../repositories/CaisseContractsRepository'
import type { ContractFilters, PaginationParams, PaginatedContracts, ContractStats } from '../entities/contract-filters.types'
import type { ContractPayment, CreateCaisseContractInput, ContractPdfMetadata, UploadContractPdfInput } from '../entities/contract.types'

export class CaisseContractsService {
  private static instance: CaisseContractsService
  private readonly repo = CaisseContractsRepository.getInstance()

  private constructor() {}

  static getInstance(): CaisseContractsService {
    if (!CaisseContractsService.instance) {
      CaisseContractsService.instance = new CaisseContractsService()
    }
    return CaisseContractsService.instance
  }

  async getContractsWithFilters(filters?: ContractFilters, pagination?: PaginationParams): Promise<PaginatedContracts> {
    return this.repo.getContractsWithFilters(filters, pagination)
  }

  async getContractsStats(filters?: ContractFilters): Promise<ContractStats> {
    return this.repo.getContractsStats(filters)
  }

  async getContractById(id: string): Promise<CaisseContract | null> {
    return this.repo.getContractById(id)
  }

  async createContract(input: CreateCaisseContractInput): Promise<string> {
    return this.repo.createContract(input)
  }

  async uploadContractPdf(input: UploadContractPdfInput): Promise<ContractPdfMetadata> {
    return this.repo.uploadContractPdf(input)
  }

  async getContractPayments(contractId: string): Promise<ContractPayment[]> {
    return this.repo.getContractPayments(contractId)
  }
}
