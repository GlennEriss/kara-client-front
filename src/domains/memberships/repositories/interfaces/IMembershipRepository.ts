/**
 * Interface du Repository pour Membership Requests V2
 */

import type { 
  MembershipRequest, 
  MembershipRequestFilters, 
  MembershipRequestsResponse,
  MembershipStatistics,
  PaymentInfo,
} from '../../entities/MembershipRequest'

export interface IMembershipRepository {
  /**
   * Récupère toutes les demandes avec pagination et filtres
   * @param filters Filtres optionnels (status, isPaid, etc.)
   * @param page Numéro de page (défaut: 1)
   * @param limit Nombre d'éléments par page (défaut: 10)
   * @returns Liste paginée des demandes
   */
  getAll(
    filters?: MembershipRequestFilters, 
    page?: number, 
    limit?: number
  ): Promise<MembershipRequestsResponse>

  /**
   * Récupère une demande par son ID
   * @param id Identifiant de la demande
   * @returns La demande ou null si inexistante
   */
  getById(id: string): Promise<MembershipRequest | null>

  /**
   * Met à jour le statut d'une demande
   * @param id Identifiant de la demande
   * @param status Nouveau statut
   * @param data Données additionnelles à mettre à jour
   */
  updateStatus(
    id: string, 
    status: MembershipRequest['status'], 
    data?: Partial<MembershipRequest>
  ): Promise<void>

  /**
   * Marque une demande comme payée
   * @param id Identifiant de la demande
   * @param paymentInfo Informations de paiement
   */
  markAsPaid(id: string, paymentInfo: PaymentInfo): Promise<void>

  /**
   * Récupère les statistiques des demandes
   * @returns Statistiques complètes (totaux, par statut, par paiement, pourcentages)
   */
  getStatistics(): Promise<MembershipStatistics>

  /**
   * Recherche des demandes par texte (nom, email, téléphone)
   * @param query Terme de recherche
   * @param filters Filtres additionnels
   * @returns Liste des demandes trouvées
   */
  search(query: string, filters?: MembershipRequestFilters): Promise<MembershipRequest[]>

  /**
   * Crée une nouvelle demande d'adhésion
   * @param formData Données du formulaire d'inscription
   * @returns L'ID de la demande créée
   */
  create(formData: any): Promise<string>
}
