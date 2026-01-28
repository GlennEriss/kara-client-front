/**
 * Interface du Repository pour les Demandes Caisse Imprévue V2
 */

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

export interface IDemandCIRepository {
  /**
   * Récupère les demandes avec pagination serveur (cursor-based)
   */
  getPaginated(
    filters?: DemandFilters,
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<PaginatedDemands>

  /**
   * Récupère une demande par ID
   */
  getById(id: string): Promise<CaisseImprevueDemand | null>

  /**
   * Crée une nouvelle demande avec ID standardisé
   * Format ID: MK_DEMANDE_CI_{4PremiersChiffresMatricule}_{DDMMYY}_{HHMM}
   */
  create(
    data: CreateCaisseImprevueDemandInput,
    memberMatricule: string
  ): Promise<CaisseImprevueDemand>

  /**
   * Met à jour une demande avec traçabilité
   */
  update(
    id: string,
    data: UpdateCaisseImprevueDemandInput,
    updatedBy: string
  ): Promise<CaisseImprevueDemand>

  /**
   * Accepte une demande avec traçabilité
   */
  accept(
    id: string,
    input: AcceptDemandInput,
    acceptedBy: string
  ): Promise<CaisseImprevueDemand>

  /**
   * Refuse une demande avec traçabilité
   */
  reject(
    id: string,
    input: RejectDemandInput,
    rejectedBy: string
  ): Promise<CaisseImprevueDemand>

  /**
   * Réouvre une demande refusée avec traçabilité
   */
  reopen(
    id: string,
    input: ReopenDemandInput,
    reopenedBy: string
  ): Promise<CaisseImprevueDemand>

  /**
   * Supprime une demande avec traçabilité (enregistre deletedBy/deletedAt avant suppression)
   */
  delete(id: string, deletedBy: string): Promise<void>

  /**
   * Recherche des demandes par nom/prénom du membre
   */
  search(query: string, filters?: DemandFilters, limit?: number): Promise<CaisseImprevueDemand[]>

  /**
   * Récupère les statistiques des demandes
   */
  getStats(filters?: DemandFilters): Promise<DemandStats>
}
