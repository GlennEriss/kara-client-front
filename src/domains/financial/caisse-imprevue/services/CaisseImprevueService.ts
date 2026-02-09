/**
 * Service métier pour les Demandes Caisse Imprévue V2
 * 
 * Orchestre les repositories et implémente la logique métier
 * avec traçabilité complète selon le workflow V2.
 */

import { DemandCIRepository } from '../repositories/DemandCIRepository'
import { RepositoryFactory } from '@/factories/RepositoryFactory'
import type { IContractCIRepository } from '@/repositories/caisse-imprevu/IContractCIRepository'
import type { ContractCI } from '@/types/types'
import type {
  CaisseImprevueDemand,
  CreateCaisseImprevueDemandInput,
  UpdateCaisseImprevueDemandInput,
  AcceptDemandInput,
  RejectDemandInput,
  ReopenDemandInput,
} from '../entities/demand.types'
import type {
  DemandFilters,
  PaginationParams,
  SortParams,
  PaginatedDemands,
  DemandStats,
} from '../entities/demand-filters.types'

export class CaisseImprevueService {
  private static instance: CaisseImprevueService
  private demandRepository: DemandCIRepository
  private contractRepository: IContractCIRepository
  private memberRepository: ReturnType<typeof RepositoryFactory.getMemberRepository>

  private constructor() {
    this.demandRepository = DemandCIRepository.getInstance()
    this.contractRepository = RepositoryFactory.getContractCIRepository()
    this.memberRepository = RepositoryFactory.getMemberRepository()
  }

  static getInstance(): CaisseImprevueService {
    if (!CaisseImprevueService.instance) {
      CaisseImprevueService.instance = new CaisseImprevueService()
    }
    return CaisseImprevueService.instance
  }

  /**
   * Crée une nouvelle demande avec validation et traçabilité
   */
  async createDemand(
    data: CreateCaisseImprevueDemandInput,
    createdBy: string
  ): Promise<CaisseImprevueDemand> {
    // Validation métier
    if (!data.memberId) {
      throw new Error('Le membre est requis')
    }

    if (!data.cause || data.cause.length < 10 || data.cause.length > 500) {
      throw new Error('Le motif de la demande doit contenir entre 10 et 500 caractères')
    }

    if (!data.subscriptionCIID) {
      throw new Error('Le forfait est requis')
    }

    if (!data.emergencyContact) {
      throw new Error('Le contact d\'urgence est requis')
    }

    // Récupérer le matricule du membre pour générer l'ID
    const member = await this.memberRepository.getMemberById(data.memberId)
    if (!member) {
      throw new Error('Membre non trouvé')
    }

    if (!member.matricule) {
      throw new Error('Le matricule du membre est requis pour générer l\'ID de la demande')
    }

    // Créer la demande avec traçabilité
    const demandData: CreateCaisseImprevueDemandInput = {
      ...data,
      createdBy,
    }

    return await this.demandRepository.create(demandData, member.matricule)
  }

  /**
   * Met à jour une demande avec traçabilité
   */
  async updateDemand(
    id: string,
    data: UpdateCaisseImprevueDemandInput,
    updatedBy: string
  ): Promise<CaisseImprevueDemand> {
    // Validation métier
    if (data.cause && (data.cause.length < 10 || data.cause.length > 500)) {
      throw new Error('Le motif de la demande doit contenir entre 10 et 500 caractères')
    }

    return await this.demandRepository.update(id, data, updatedBy)
  }

  /**
   * Accepte une demande avec traçabilité
   */
  async acceptDemand(
    id: string,
    input: AcceptDemandInput,
    acceptedBy: string
  ): Promise<CaisseImprevueDemand> {
    // Validation métier
    if (!input.reason || input.reason.length < 10) {
      throw new Error('La raison d\'acceptation doit contenir au moins 10 caractères')
    }

    // Vérifier que la demande est en statut PENDING ou REOPENED
    const demand = await this.demandRepository.getById(id)
    if (!demand) {
      throw new Error('Demande non trouvée')
    }

    if (demand.status !== 'PENDING' && demand.status !== 'REOPENED') {
      throw new Error(`Impossible d'accepter une demande en statut ${demand.status}`)
    }

    return await this.demandRepository.accept(id, input, acceptedBy)
  }

  /**
   * Refuse une demande avec traçabilité
   */
  async rejectDemand(
    id: string,
    input: RejectDemandInput,
    rejectedBy: string
  ): Promise<CaisseImprevueDemand> {
    // Validation métier
    if (!input.reason || input.reason.length < 10) {
      throw new Error('Le motif de refus doit contenir au moins 10 caractères')
    }

    // Vérifier que la demande est en statut PENDING ou REOPENED
    const demand = await this.demandRepository.getById(id)
    if (!demand) {
      throw new Error('Demande non trouvée')
    }

    if (demand.status !== 'PENDING' && demand.status !== 'REOPENED') {
      throw new Error(`Impossible de refuser une demande en statut ${demand.status}`)
    }

    return await this.demandRepository.reject(id, input, rejectedBy)
  }

  /**
   * Réouvre une demande refusée avec traçabilité
   */
  async reopenDemand(
    id: string,
    input: ReopenDemandInput,
    reopenedBy: string
  ): Promise<CaisseImprevueDemand> {
    // Vérifier que la demande est en statut REJECTED
    const demand = await this.demandRepository.getById(id)
    if (!demand) {
      throw new Error('Demande non trouvée')
    }

    if (demand.status !== 'REJECTED') {
      throw new Error(`Impossible de réouvrir une demande en statut ${demand.status}`)
    }

    return await this.demandRepository.reopen(id, input, reopenedBy)
  }

  /**
   * Supprime une demande avec traçabilité
   */
  async deleteDemand(id: string, deletedBy: string): Promise<void> {
    // Vérifier que la demande existe
    const demand = await this.demandRepository.getById(id)
    if (!demand) {
      throw new Error('Demande non trouvée')
    }

    await this.demandRepository.delete(id, deletedBy)
  }

  /**
   * Récupère les demandes avec pagination serveur
   */
  async getPaginatedDemands(
    filters?: DemandFilters,
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<PaginatedDemands> {
    return await this.demandRepository.getPaginated(filters, pagination, sort)
  }

  /**
   * Récupère une demande par ID
   */
  async getDemandById(id: string): Promise<CaisseImprevueDemand | null> {
    return await this.demandRepository.getById(id)
  }

  /**
   * Recherche des demandes par nom/prénom
   */
  async searchDemands(
    searchQuery: string,
    filters?: DemandFilters,
    limit?: number
  ): Promise<CaisseImprevueDemand[]> {
    return await this.demandRepository.search(searchQuery, filters, limit)
  }

  /**
   * Récupère les statistiques des demandes
   */
  async getDemandsStats(filters?: DemandFilters): Promise<DemandStats> {
    return await this.demandRepository.getStats(filters)
  }

  /**
   * Convertit une date (Date, Timestamp Firestore, string) en string YYYY-MM-DD
   */
  private toDateString(value: Date | string | { toDate?: () => Date } | undefined): string {
    if (!value) return new Date().toISOString().split('T')[0]
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.split('T')[0]
    const date = value instanceof Date ? value : (value as { toDate?: () => Date })?.toDate?.() ?? new Date(value as string)
    return date.toISOString().split('T')[0]
  }

  /**
   * Crée un contrat depuis une demande acceptée avec traçabilité
   * Conforme à la doc : SEQ_CreerContrat.puml et CreerContrat.puml
   */
  async createContractFromDemand(
    demandId: string,
    convertedBy: string
  ): Promise<{ contractId: string; demand: CaisseImprevueDemand }> {
    // Validation : la demande doit être acceptée
    const demand = await this.demandRepository.getById(demandId)
    if (!demand) {
      throw new Error('Demande non trouvée')
    }

    if (demand.status !== 'APPROVED') {
      throw new Error(`Impossible de créer un contrat depuis une demande en statut ${demand.status}`)
    }

    if (demand.contractId) {
      throw new Error('Cette demande a déjà été convertie en contrat')
    }

    // Générer l'ID du contrat : MK_CI_CONTRACT_{memberId}_{DDMMYY}_{HHMM}
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = String(now.getFullYear()).slice(-2)
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const contractId = `MK_CI_CONTRACT_${demand.memberId}_${day}${month}${year}_${hours}${minutes}`

    // Créer le contrat à partir des données de la demande
    // demandId requis par les règles Firestore pour traçabilité
    const contractData: Omit<ContractCI, 'createdAt' | 'updatedAt'> & { demandId: string } = {
      id: contractId,
      demandId,
      memberId: demand.memberId,
      memberFirstName: demand.memberFirstName || '',
      memberLastName: demand.memberLastName || '',
      memberContacts: demand.memberContacts || [],
      memberEmail: demand.memberEmail,
      subscriptionCIID: demand.subscriptionCIID,
      subscriptionCICode: demand.subscriptionCICode,
      subscriptionCILabel: demand.subscriptionCILabel,
      subscriptionCIAmountPerMonth: demand.subscriptionCIAmountPerMonth,
      subscriptionCINominal: demand.subscriptionCINominal ?? demand.subscriptionCIAmountPerMonth * demand.subscriptionCIDuration,
      subscriptionCIDuration: demand.subscriptionCIDuration,
      subscriptionCISupportMin: demand.subscriptionCISupportMin ?? 0,
      subscriptionCISupportMax: demand.subscriptionCISupportMax ?? 0,
      paymentFrequency: demand.paymentFrequency,
      firstPaymentDate: this.toDateString(demand.firstPaymentDate ?? demand.desiredStartDate),
      emergencyContact: {
        ...demand.emergencyContact,
        documentPhotoUrl: demand.emergencyContact.documentPhotoUrl ?? '',
      },
      status: 'ACTIVE',
      totalMonthsPaid: 0,
      isEligibleForSupport: false,
      supportHistory: [],
      createdBy: convertedBy,
      updatedBy: convertedBy,
    }

    const contract = await this.contractRepository.createContract(contractData)

    // Mettre à jour la demande : status CONVERTED + contractId (traçabilité)
    const converted = await this.demandRepository.convert(
      demandId,
      { contractId: contract.id },
      convertedBy
    )

    return {
      contractId: contract.id,
      demand: converted,
    }
  }

  /**
   * Supprime définitivement un contrat CI (ACTIVE, sans activité).
   * Réactive la demande si demandId, nettoie les documents liés, puis supprime le contrat.
   */
  async deleteContractCI(contractId: string, adminId: string): Promise<void> {
    const contract = await this.contractRepository.getContractById(contractId)
    if (!contract) {
      throw new Error('Contrat introuvable')
    }

    if (contract.status !== 'ACTIVE') {
      throw new Error('Seuls les contrats actifs sans activité peuvent être supprimés')
    }

    const paymentRepository = RepositoryFactory.getPaymentCIRepository()
    const supportRepository = RepositoryFactory.getSupportCIRepository()
    const earlyRefundRepository = RepositoryFactory.getEarlyRefundCIRepository()
    const documentRepository = RepositoryFactory.getDocumentRepository()

    const payments = await paymentRepository.getPaymentsByContractId(contractId)
    if (payments.length > 0 || (contract.totalMonthsPaid ?? 0) > 0) {
      throw new Error('Impossible de supprimer un contrat avec des versements')
    }

    const supports = await supportRepository.getSupportHistory(contractId)
    if (supports.length > 0 || contract.currentSupportId || (contract.supportHistory?.length ?? 0) > 0) {
      throw new Error('Impossible de supprimer un contrat avec un support')
    }

    const refunds = await earlyRefundRepository.getEarlyRefundsByContractId(contractId)
    if (refunds.length > 0) {
      throw new Error('Impossible de supprimer un contrat avec un remboursement')
    }

    if (contract.demandId) {
      const demand = await this.demandRepository.getById(contract.demandId)
      if (!demand) {
        throw new Error('Demande liée introuvable')
      }
      await this.demandRepository.update(
        contract.demandId,
        { status: 'APPROVED', contractId: null },
        adminId
      )
    }

    const documentIds = [
      contract.contractStartId,
      contract.contractCanceledId,
      contract.contractFinishedId,
      contract.earlyRefundDocumentId,
      contract.finalRefundDocumentId,
    ].filter((id): id is string => Boolean(id))

    for (const id of documentIds) {
      try {
        const doc = await documentRepository.getDocumentById(id)
        if (doc?.path) {
          await documentRepository.deleteFile(doc.path)
        }
        await documentRepository.deleteDocument(id)
      } catch (err) {
        console.error('Erreur nettoyage document', id, err)
      }
    }

    await this.contractRepository.deleteContract(contractId)
  }
}
