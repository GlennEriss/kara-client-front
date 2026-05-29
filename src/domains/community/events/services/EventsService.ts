/**
 * Service métier pour les Événements
 *
 * Encapsule les règles fonctionnelles autour du repository :
 * - Transitions de statut (publish, confirmLocation, cancel)
 * - Calcul des résultats du sondage
 * - Pré-validation des votes (l'éligibilité abonnement actif sera vérifiée
 *   au niveau du hook côté membre, mais le service rejette les votes invalides)
 *
 * Les notifications seront ajoutées dans une étape ultérieure (voir TODO).
 */

import { EventsRepository } from '../repositories/EventsRepository'
import type { IEventsRepository } from '../repositories/IEventsRepository'
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
  CastVoteInput,
  EventVote,
  EventVoter,
  PollResults,
} from '../entities/event-vote.types'

export class EventsService {
  private static instance: EventsService
  private readonly repo: IEventsRepository

  private constructor(repo?: IEventsRepository) {
    this.repo = repo ?? EventsRepository.getInstance()
  }

  static getInstance(): EventsService {
    if (!EventsService.instance) {
      EventsService.instance = new EventsService()
    }
    return EventsService.instance
  }

  // ===== Lecture =====

  getPaginatedEvents(
    filters?: EventFilters,
    pagination?: EventsPaginationParams,
    sort?: EventsSortParams,
  ): Promise<PaginatedEvents> {
    return this.repo.getPaginated(filters, pagination, sort)
  }

  getEventById(id: string): Promise<Event | null> {
    return this.repo.getById(id)
  }

  searchEvents(query: string, limit = 20): Promise<Event[]> {
    return this.repo.search(query, limit)
  }

  getStats(): Promise<EventStats> {
    return this.repo.getStats()
  }

  // ===== Mutations =====

  createEvent(data: CreateEventInput, createdBy: string): Promise<Event> {
    return this.repo.create(data, createdBy)
  }

  updateEvent(id: string, data: UpdateEventInput, updatedBy: string): Promise<Event> {
    return this.repo.update(id, data, updatedBy)
  }

  deleteEvent(id: string, deletedBy: string): Promise<void> {
    return this.repo.delete(id, deletedBy)
  }

  /**
   * Publie un événement : passe de 'draft' à 'published' ou 'poll_open'.
   * TODO: envoyer notif "event_published" / "event_poll_opened" à tous les
   * membres actifs (à brancher quand le notificationsService sera prêt).
   */
  async publishEvent(id: string, publishedBy: string): Promise<Event> {
    const current = await this.repo.getById(id)
    if (!current) throw new Error('Événement introuvable')
    if (current.status !== 'draft') {
      throw new Error('Seul un événement en brouillon peut être publié')
    }
    return this.repo.publish(id, publishedBy)
  }

  /**
   * Clôture le sondage et fige le lieu gagnant.
   * TODO: envoyer notif "event_location_confirmed".
   */
  async confirmLocation(
    id: string,
    input: ConfirmLocationInput,
    confirmedBy: string,
  ): Promise<Event> {
    const current = await this.repo.getById(id)
    if (!current) throw new Error('Événement introuvable')
    if (current.status !== 'poll_open') {
      throw new Error('Le sondage doit être ouvert pour figer le lieu')
    }
    return this.repo.confirmLocation(id, input, confirmedBy)
  }

  /**
   * Annule un événement.
   * TODO: envoyer notif "event_cancelled".
   */
  async cancelEvent(
    id: string,
    input: CancelEventInput,
    cancelledBy: string,
  ): Promise<Event> {
    const current = await this.repo.getById(id)
    if (!current) throw new Error('Événement introuvable')
    if (current.status === 'cancelled') {
      throw new Error('Événement déjà annulé')
    }
    if (current.status === 'completed') {
      throw new Error('Impossible d\'annuler un événement passé')
    }
    return this.repo.cancel(id, input, cancelledBy)
  }

  // ===== Votes =====

  listVoters(eventId: string): Promise<EventVoter[]> {
    return this.repo.listVotes(eventId)
  }

  getMemberVote(eventId: string, memberId: string): Promise<EventVote | null> {
    return this.repo.getMemberVote(eventId, memberId)
  }

  /**
   * Enregistre ou modifie le vote d'un membre.
   *
   * Pré-requis (vérifiés ici en plus des règles Firestore) :
   *   - L'événement existe et a un sondage en cours (poll_open)
   *   - La date de clôture n'est pas dépassée
   *   - L'optionId est valide
   *
   * NB : l'éligibilité "abonnement actif" est vérifiée côté hook member,
   * car ce service ne connaît pas l'état de l'abonnement.
   */
  async castVote(eventId: string, input: CastVoteInput): Promise<EventVote> {
    const event = await this.repo.getById(eventId)
    if (!event) throw new Error('Événement introuvable')
    if (event.status !== 'poll_open') {
      throw new Error('Le sondage n\'est pas ouvert')
    }
    if (event.pollClosesAt && event.pollClosesAt.getTime() < Date.now()) {
      throw new Error('La date de clôture du sondage est dépassée')
    }
    const isValidOption = (event.proposedLocations ?? []).some(
      (o) => o.id === input.optionId,
    )
    if (!isValidOption) {
      throw new Error('Option de vote invalide')
    }
    return this.repo.castVote(eventId, input)
  }

  removeVote(eventId: string, memberId: string): Promise<void> {
    return this.repo.removeVote(eventId, memberId)
  }

  /**
   * Calcule les résultats d'un sondage à partir d'un événement (compteurs
   * dénormalisés). Pour des résultats détaillés "qui a voté quoi", utiliser
   * listVoters.
   */
  computePollResults(event: Event): PollResults {
    const byOptionId: Record<string, number> = {}
    for (const opt of event.proposedLocations ?? []) {
      byOptionId[opt.id] = event.votesByOptionId?.[opt.id] ?? 0
    }
    const totalVotes = event.totalVotes ?? Object.values(byOptionId).reduce((a, b) => a + b, 0)

    const percentByOptionId: Record<string, number> = {}
    for (const [id, count] of Object.entries(byOptionId)) {
      percentByOptionId[id] = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
    }

    let leadingOptionId: string | undefined
    let max = -1
    for (const [id, count] of Object.entries(byOptionId)) {
      if (count > max) {
        max = count
        leadingOptionId = id
      }
    }
    if (max <= 0) leadingOptionId = undefined

    return { totalVotes, byOptionId, percentByOptionId, leadingOptionId }
  }
}
