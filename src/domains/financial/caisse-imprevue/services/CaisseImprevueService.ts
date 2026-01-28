/**
 * Service métier pour les Demandes Caisse Imprévue V2
 * 
 * Orchestre les repositories et implémente la logique métier
 * avec traçabilité complète selon le workflow V2.
 */

import { DemandCIRepository } from '../repositories/DemandCIRepository'
import { RepositoryFactory } from '@/factories/RepositoryFactory'
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
  private memberRepository: ReturnType<typeof RepositoryFactory.getMemberRepository>

  private constructor() {
    this.demandRepository = DemandCIRepository.getInstance()
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
   * Crée un contrat depuis une demande acceptée avec traçabilité
   * Note: Cette méthode sera implémentée dans le service de contrats
   */
  async createContractFromDemand(
    demandId: string,
    convertedBy: string
  ): Promise<{ contractId: string; demand: CaisseImprevueDemand }> {
    // Vérifier que la demande est acceptée
    const demand = await this.demandRepository.getById(demandId)
    if (!demand) {
      throw new Error('Demande non trouvée')
    }

    if (demand.status !== 'APPROVED') {
      throw new Error(`Impossible de créer un contrat depuis une demande en statut ${demand.status}`)
    }

    // TODO: Implémenter la création du contrat
    // Pour l'instant, on marque juste la demande comme convertie
    const converted = await this.demandRepository.convert(
      demandId,
      {
        contractId: undefined, // TODO: Remplacer par l'ID réel du contrat créé
      },
      convertedBy
    )

    // TODO: Retourner le contractId réel une fois la création de contrat implémentée
    return {
      contractId: converted.contractId || '',
      demand: converted,
    }
  }
}
