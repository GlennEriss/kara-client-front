import type { CaisseContract } from '@/types/types'
import { CaisseContractsRepository } from '../repositories/CaisseContractsRepository'
import type { ContractFilters, PaginationParams, PaginatedContracts, ContractStats } from '../entities/contract-filters.types'
import type { ContractPayment, CreateCaisseContractInput, ContractPdfMetadata, UploadContractPdfInput } from '../entities/contract.types'
import { RepositoryFactory } from '@/factories/RepositoryFactory'
import { deleteFile } from '@/db/upload-image.db'
import { removeCaisseContractFromEntity } from '@/db/member.db'

const ALLOWED_DELETE_STATUSES = ['DRAFT', 'ACTIVE'] as const

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

  /**
   * Supprime définitivement un contrat Caisse Spéciale (éligible : DRAFT/ACTIVE, sans versements ni remboursements).
   * Réactive la demande liée si présente, supprime le PDF en Storage, les sous-collections et le document contrat.
   */
  async deleteCaisseContract(contractId: string, adminId: string): Promise<void> {
    const contract = await this.repo.getContractById(contractId)
    if (!contract) {
      throw new Error('Contrat introuvable')
    }

    if (!ALLOWED_DELETE_STATUSES.includes(contract.status as any)) {
      throw new Error('Seuls les contrats DRAFT ou ACTIVE sans activité peuvent être supprimés')
    }

    if ((contract.nominalPaid ?? 0) > 0 || (contract.penaltiesTotal ?? 0) > 0) {
      throw new Error('Impossible de supprimer un contrat avec versements ou pénalités')
    }

    const payments = await this.repo.getContractPayments(contractId)
    const hasContribs = payments.some(
      (p: any) =>
        (p.status && p.status !== 'DUE') ||
        (Array.isArray(p.contribs) && p.contribs.length > 0) ||
        (Array.isArray(p.groupContributions) && p.groupContributions.length > 0) ||
        p.paidAt
    )
    if (hasContribs) {
      throw new Error('Impossible de supprimer un contrat avec contributions')
    }

    const { listRefunds } = await import('@/db/caisse/refunds.db')
    const refunds = await listRefunds(contractId)
    if (refunds.length > 0) {
      throw new Error('Impossible de supprimer un contrat avec remboursements')
    }

    const demandRepo = RepositoryFactory.getCaisseSpecialeDemandRepository()
    const demand = await demandRepo.getByContractId(contractId)
    if (demand) {
      await demandRepo.updateDemand(demand.id, {
        status: 'PENDING',
        contractId: null as any,
        updatedBy: adminId,
      })
    }

    if (contract.contractPdf?.path) {
      try {
        await deleteFile(contract.contractPdf.path)
      } catch (err) {
        console.error('Erreur suppression PDF contrat:', err)
      }
    }

    await this.repo.deletePayments(contractId)
    await this.repo.deleteRefunds(contractId)

    if (contract.memberId) {
      await removeCaisseContractFromEntity(contract.memberId, contractId, 'USER')
    }
    if (contract.groupeId) {
      await removeCaisseContractFromEntity(contract.groupeId, contractId, 'GROUP')
    }

    await this.repo.deleteContract(contractId)
  }
}
