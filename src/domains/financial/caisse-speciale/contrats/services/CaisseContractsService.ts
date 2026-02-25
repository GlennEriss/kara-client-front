import type { CaisseContract } from '@/types/types'
import { CaisseContractsRepository } from '../repositories/CaisseContractsRepository'
import type { ContractFilters, PaginationParams, PaginatedContracts, ContractStats } from '../entities/contract-filters.types'
import type { ContractPayment, CreateCaisseContractInput, ContractPdfMetadata, UploadContractPdfInput } from '../entities/contract.types'
import { RepositoryFactory } from '@/factories/RepositoryFactory'
import { deleteFile, createFile } from '@/db/upload-image.db'
import { removeCaisseContractFromEntity } from '@/db/member.db'
import { updateContractPdf, updateContract } from '@/db/caisse/contracts.db'
import { computeNextDueAt } from '@/services/caisse/engine'
import { recomputeNow } from '@/services/caisse/readers'

const ALLOWED_DELETE_STATUSES = ['DRAFT', 'ACTIVE'] as const

const ALLOWED_REPLACE_PDF_STATUSES = ['DRAFT', 'ACTIVE', 'LATE_NO_PENALTY', 'LATE_WITH_PENALTY'] as const

/** Statuts pour lesquels on peut supprimer un versement (pas terminé, pas en remboursement final/anticipé). */
const ALLOWED_DELETE_PAYMENT_STATUSES = ['DRAFT', 'ACTIVE', 'LATE_NO_PENALTY', 'LATE_WITH_PENALTY'] as const

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
   * Indique si la suppression d'un versement est autorisée pour ce contrat (selon son statut).
   */
  canDeletePayment(contract: CaisseContract | null): boolean {
    if (!contract) return false
    return ALLOWED_DELETE_PAYMENT_STATUSES.includes(contract.status as any)
  }

  /**
   * Supprime un versement (mauvaise date, erreur de saisie, etc.).
   * Autorisé uniquement si le contrat est en DRAFT, ACTIVE, LATE_NO_PENALTY ou LATE_WITH_PENALTY.
   * Interdit si contrat CLOSED, en remboursement final/anticipé, résilié, etc.
   * Recalcule les totaux du contrat (nominalPaid, bonusAccrued, penaltiesTotal) et la prochaine échéance.
   */
  async deleteContractPayment(contractId: string, paymentId: string, adminId: string): Promise<void> {
    const contract = await this.repo.getContractById(contractId)
    if (!contract) {
      throw new Error('Contrat introuvable')
    }
    if (!ALLOWED_DELETE_PAYMENT_STATUSES.includes(contract.status as any)) {
      throw new Error(
        'Impossible de supprimer un versement : le contrat est terminé, en remboursement final ou anticipé, ou résilié. ' +
        'Seuls les contrats actifs (Actif, Retard J+0..3, Retard J+4..12) permettent de supprimer un versement.'
      )
    }

    const payments = await this.repo.getContractPayments(contractId)
    const payment = payments.find((p: any) => p.id === paymentId)
    if (!payment) {
      throw new Error('Versement introuvable')
    }

    await this.repo.deletePayment(contractId, paymentId)

    const remaining = await this.repo.getContractPayments(contractId)
    const nominalPaid = remaining.reduce((sum: number, p: any) => {
      if (p.status === 'PAID') {
        return sum + (p.accumulatedAmount ?? p.amount ?? 0)
      }
      return sum
    }, 0)
    const bonusAccrued = remaining.reduce((sum: number, p: any) => sum + (p.bonusApplied ?? 0), 0)
    const penaltiesTotal = remaining.reduce((sum: number, p: any) => sum + (p.penaltyApplied ?? 0), 0)
    const paidIndices = remaining.filter((p: any) => p.status === 'PAID').map((p: any) => p.dueMonthIndex ?? 0)
    const currentMonthIndex = paidIndices.length > 0 ? Math.max(...paidIndices) + 1 : 0
    const nextDueAt = computeNextDueAt({
      ...contract,
      currentMonthIndex,
      contractStartAt: contract.contractStartAt,
    } as any)

    await updateContract(contractId, {
      nominalPaid,
      bonusAccrued,
      penaltiesTotal,
      currentMonthIndex,
      nextDueAt,
      updatedBy: adminId,
    })

    await recomputeNow(contractId)
  }

  /**
   * Remplace le PDF téléversé d'un contrat (cleanup ancien fichier + documents ADHESION_CS, upload nouveau, update contrat + doc).
   */
  async replaceContractPdf(contractId: string, file: File, adminId: string): Promise<ContractPdfMetadata> {
    const contract = await this.repo.getContractById(contractId)
    if (!contract) {
      throw new Error('Contrat introuvable')
    }
    if (!ALLOWED_REPLACE_PDF_STATUSES.includes(contract.status as any)) {
      throw new Error('Contrat non modifiable : remplacement du PDF interdit pour ce statut')
    }
    if (!contract.contractPdf?.path) {
      throw new Error('Aucun contrat téléversé à remplacer')
    }

    try {
      await deleteFile(contract.contractPdf.path)
    } catch (err) {
      console.error('Erreur suppression ancien PDF:', err)
    }

    const documentRepo = RepositoryFactory.getDocumentRepository()
    try {
      const docs = await documentRepo.getDocumentsByContractId(contractId)
      const oldDocs = docs.filter((d) => d.type === 'ADHESION_CS')
      for (const d of oldDocs) {
        if (d.id) await documentRepo.deleteDocument(d.id)
      }
    } catch (err) {
      console.error('Erreur suppression documents ADHESION_CS:', err)
    }

    const upload = await createFile(file, contractId, `contracts/${contractId}`)
    const payload: ContractPdfMetadata = {
      fileSize: file.size,
      path: upload.path,
      originalFileName: file.name,
      uploadedAt: new Date(),
      url: upload.url,
    }

    await updateContractPdf(contractId, payload, adminId)

    const memberIdForDoc = contract.memberId || (contract.groupeId ? `GROUP_${contract.groupeId}` : contractId)
    await documentRepo.createDocument({
      type: 'ADHESION_CS',
      format: 'pdf',
      libelle: `Contrat Caisse Spéciale #${contractId.slice(-6)}`,
      path: upload.path,
      url: upload.url,
      size: file.size,
      memberId: memberIdForDoc,
      contractId,
      createdBy: adminId,
      updatedBy: adminId,
    })

    return payload
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
