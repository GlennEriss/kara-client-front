/**
 * Types et interfaces pour les Événements KARA
 *
 * Un événement est organisé par l'association et peut éventuellement
 * inclure un sondage de lieu (les membres avec abonnement actif votent).
 */

/**
 * Statut d'un événement
 */
export type EventStatus =
  | 'draft'                // Brouillon, non visible des membres
  | 'published'            // Publié, lieu fixé (sans sondage)
  | 'poll_open'            // Publié, sondage de lieu en cours
  | 'location_confirmed'   // Sondage clôturé, lieu officiel choisi
  | 'completed'            // Événement passé
  | 'cancelled'            // Événement annulé

/**
 * Catégorie / type d'événement
 */
export type EventType =
  | 'assembly'      // Assemblée générale
  | 'celebration'   // Fête / célébration
  | 'training'      // Formation
  | 'charity'       // Action caritative
  | 'other'

/**
 * Option de lieu proposée dans un sondage
 *
 * id : généré côté client (uuid court) lors de la création du sondage.
 */
export interface EventLocationOption {
  id: string
  name: string            // Ex: "Orphelinat Saint-Joseph"
  address?: string        // Adresse postale ou indication
  description?: string    // Détails additionnels (capacité, accès…)
}

/**
 * Lieu final (utilisé pour les événements sans sondage,
 * et pour figer le lieu gagnant après clôture du sondage)
 */
export interface EventFinalLocation {
  id?: string             // Si issu d'une option du sondage, son id
  name: string
  address?: string
  description?: string
}

/**
 * Interface principale d'un événement
 *
 * Format ID standardisé : MK_EVENT_{YYYYMMDD}_{HHMM}_{4charRandom}
 * Exemple : MK_EVENT_20260615_1400_a3f2
 */
export interface Event {
  id: string

  // Informations générales
  title: string
  description: string
  imageURL?: string
  type?: EventType

  // Dates de l'événement
  startDate: Date
  endDate?: Date

  // Statut
  status: EventStatus

  // ===== Gestion du lieu =====
  /** Si true, un sondage est associé à cet événement */
  pollEnabled: boolean

  /** Options proposées au vote (uniquement si pollEnabled) */
  proposedLocations?: EventLocationOption[]

  /** Date de clôture du sondage (uniquement si pollEnabled) */
  pollClosesAt?: Date

  /** Date effective de clôture (mise à jour par l'admin) */
  pollClosedAt?: Date

  /**
   * Lieu final officiel.
   * - Pour un événement sans sondage : renseigné dès la publication
   * - Pour un événement avec sondage : renseigné à la clôture
   */
  finalLocation?: EventFinalLocation

  // ===== Lien vers la collecte =====
  /**
   * Événement caritatif (`charity-events`) associé, quand cet événement donne
   * lieu à une collecte. L'argent — participants, contributions, validations,
   * reçus — reste géré par le module bienfaiteur : on ne fait qu'y renvoyer.
   */
  charityEventId?: string

  // ===== Stats dénormalisées (mises à jour à chaque vote) =====
  /** Nombre total de votants (= nombre de docs dans la sous-collection votes) */
  totalVotes?: number

  /** Compteur par optionId : { 'opt_a': 12, 'opt_b': 5, ... } */
  votesByOptionId?: Record<string, number>

  // ===== Traçabilité =====
  createdBy: string       // uid admin
  createdAt: Date
  updatedBy?: string
  updatedAt?: Date
  publishedBy?: string
  publishedAt?: Date
  cancelledBy?: string
  cancelledAt?: Date
  cancellationReason?: string
}

/**
 * Données pour créer un nouvel événement (avant génération id/dates)
 */
export type CreateEventInput = Omit<
  Event,
  | 'id'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
  | 'publishedAt'
  | 'cancelledAt'
  | 'pollClosedAt'
  | 'totalVotes'
  | 'votesByOptionId'
  | 'updatedBy'
  | 'publishedBy'
  | 'cancelledBy'
  | 'cancellationReason'
> & {
  status?: EventStatus    // par défaut: 'draft'
}

/**
 * Données pour mettre à jour un événement (champs modifiables)
 */
export type UpdateEventInput = Partial<
  Pick<
    Event,
    | 'title'
    | 'description'
    | 'imageURL'
    | 'type'
    | 'startDate'
    | 'endDate'
    | 'pollEnabled'
    | 'proposedLocations'
    | 'pollClosesAt'
    | 'finalLocation'
    | 'charityEventId'
    | 'status'
  >
>

/**
 * Données pour figer le lieu gagnant à la clôture d'un sondage
 */
export interface ConfirmLocationInput {
  /** Id de l'option gagnante (parmi proposedLocations) */
  optionId: string
}

/**
 * Données pour annuler un événement
 */
export interface CancelEventInput {
  reason: string   // Min 10 caractères, affiché aux membres
}
