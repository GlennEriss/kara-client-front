/**
 * Interface du Repository pour les Événements
 *
 * Couvre CRUD événements + gestion des votes (sous-collection)
 * + opérations spécifiques (publier, clôturer sondage, confirmer lieu, annuler).
 */

import type {
  Event,
  CreateEventInput,
  UpdateEventInput,
  ConfirmLocationInput,
  CancelEventInput,
} from '../entities/event.types'
import type {
  EventFilters,
  EventsPaginationParams,
  EventsSortParams,
  PaginatedEvents,
  EventStats,
} from '../entities/event-filters.types'
import type {
  EventVote,
  CastVoteInput,
  EventVoter,
} from '../entities/event-vote.types'

export interface IEventsRepository {
  // ===== CRUD Événements =====

  /**
   * Liste paginée d'événements (curseur Firestore)
   */
  getPaginated(
    filters?: EventFilters,
    pagination?: EventsPaginationParams,
    sort?: EventsSortParams,
  ): Promise<PaginatedEvents>

  /**
   * Récupère un événement par son id
   */
  getById(id: string): Promise<Event | null>

  /**
   * Crée un événement (statut par défaut: 'draft')
   */
  create(data: CreateEventInput, createdBy: string): Promise<Event>

  /**
   * Met à jour un événement
   */
  update(
    id: string,
    data: UpdateEventInput,
    updatedBy: string,
  ): Promise<Event>

  /**
   * Supprime un événement (uniquement si status === 'draft')
   */
  delete(id: string, deletedBy: string): Promise<void>

  /**
   * Publie un événement
   * - Si pollEnabled : passe en 'poll_open'
   * - Sinon : passe en 'published'
   */
  publish(id: string, publishedBy: string): Promise<Event>

  /**
   * Clôture le sondage et fige le lieu gagnant
   * - Met status = 'location_confirmed'
   * - Renseigne finalLocation à partir de l'optionId
   * - Marque pollClosedAt
   */
  confirmLocation(
    id: string,
    input: ConfirmLocationInput,
    confirmedBy: string,
  ): Promise<Event>

  /**
   * Annule un événement (avec raison)
   */
  cancel(
    id: string,
    input: CancelEventInput,
    cancelledBy: string,
  ): Promise<Event>

  /**
   * Recherche par titre (préfixe)
   */
  search(searchQuery: string, limit?: number): Promise<Event[]>

  /**
   * Statistiques globales
   */
  getStats(): Promise<EventStats>

  // ===== Votes (sous-collection events/{id}/votes) =====

  /**
   * Récupère tous les votes d'un événement (admin)
   */
  listVotes(eventId: string): Promise<EventVoter[]>

  /**
   * Récupère le vote d'un membre spécifique (lecture par membre ou admin)
   */
  getMemberVote(eventId: string, memberId: string): Promise<EventVote | null>

  /**
   * Enregistre ou met à jour le vote d'un membre (upsert)
   * NB : la vérification d'éligibilité (abonnement actif + sondage ouvert)
   * doit être faite dans le service, pas ici.
   */
  castVote(eventId: string, input: CastVoteInput): Promise<EventVote>

  /**
   * Supprime le vote d'un membre (rare — ex: admin override)
   */
  removeVote(eventId: string, memberId: string): Promise<void>
}
