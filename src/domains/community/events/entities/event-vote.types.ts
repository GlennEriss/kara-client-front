/**
 * Types pour les votes sur le lieu d'un événement
 *
 * Sous-collection : events/{eventId}/votes/{memberId}
 * Le doc id = memberId (matricule) garantit 1 voix / membre et permet
 * la modification d'un vote tant que le sondage est ouvert (upsert).
 */

export interface EventVote {
  /** Matricule du membre (= doc id) */
  memberId: string

  /** Nom complet dénormalisé pour affichage admin */
  memberName?: string

  /** Id de l'option choisie (parmi event.proposedLocations) */
  optionId: string

  /** Première date de vote */
  votedAt: Date

  /** Dernière date de modification du vote */
  updatedAt?: Date
}

/**
 * Données pour enregistrer / modifier un vote
 */
export interface CastVoteInput {
  memberId: string
  memberName?: string
  optionId: string
}

/**
 * Résultats agrégés d'un sondage
 *
 * Calculé soit depuis event.votesByOptionId (rapide), soit en relisant la
 * sous-collection (admin, vue détaillée).
 */
export interface PollResults {
  totalVotes: number
  /** Compteur par optionId */
  byOptionId: Record<string, number>
  /** Pourcentage par optionId (0–100, arrondi à l'entier) */
  percentByOptionId: Record<string, number>
  /** Id de l'option en tête (undefined si aucun vote) */
  leadingOptionId?: string
}

/**
 * Représente un votant avec son choix, pour la table admin "qui a voté quoi"
 */
export interface EventVoter {
  memberId: string
  memberName?: string
  optionId: string
  votedAt: Date
}
