import type { CaisseContract } from '@/types/types'
import type { ContractFilters, PaginationParams, PaginatedContracts, ContractStats } from '../entities/contract-filters.types'
import type { ContractPayment, CreateCaisseContractInput, ContractPdfMetadata, UploadContractPdfInput } from '../entities/contract.types'

export interface ICaisseContractsRepository {
  getContractsWithFilters(filters?: ContractFilters, pagination?: PaginationParams): Promise<PaginatedContracts>
  getContractsStats(filters?: ContractFilters): Promise<ContractStats>
  getContractById(id: string): Promise<CaisseContract | null>
  createContract(input: CreateCaisseContractInput): Promise<string>
  uploadContractPdf(input: UploadContractPdfInput): Promise<ContractPdfMetadata>
  getContractPayments(contractId: string): Promise<ContractPayment[]>
  deletePayments(contractId: string): Promise<void>
  deleteRefunds(contractId: string): Promise<void>
  deleteContract(contractId: string): Promise<void>
}
