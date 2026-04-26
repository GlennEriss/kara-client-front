/**
 * Types pour les filtres, pagination et tri des Demandes Caisse Imprévue V2
 */

import type { CaisseImprevueDemandStatus, CaisseImprevuePaymentFrequency } from './demand.types'

/**
 * Filtres pour la recherche de demandes
 */
export interface DemandFilters {
  status?: CaisseImprevueDemandStatus | 'all'
  paymentFrequency?: CaisseImprevuePaymentFrequency | 'all'
  subscriptionCIID?: string
  memberId?: string
  decisionMadeBy?: string
  dateStart?: string // Format: YYYY-MM-DD
  dateEnd?: string // Format: YYYY-MM-DD
  /** Montant mensuel min (FCFA) */
  monthlyAmountMin?: number
  /** Montant mensuel max (FCFA) */
  monthlyAmountMax?: number
  /** Durée min (mois) */
  durationMonthsMin?: number
  /** Durée max (mois) */
  durationMonthsMax?: number
  /** Date de création (borne basse) */
  createdAtFrom?: string // Format: YYYY-MM-DD
  /** Date de création (borne haute) */
  createdAtTo?: string // Format: YYYY-MM-DD
  /** Date souhaitée de début (borne basse) */
  desiredDateFrom?: string // Format: YYYY-MM-DD
  /** Date souhaitée de début (borne haute) */
  desiredDateTo?: string // Format: YYYY-MM-DD
  /** Recherche par nom/prénom (préfixe sur memberLastName côté serveur) */
  searchQuery?: string
}

/**
 * Paramètres de pagination serveur (cursor-based)
 */
export interface PaginationParams {
  page: number // Page actuelle (commence à 1)
  limit: number // Nombre d'éléments par page (10, 25, 50, 100)
  cursor?: string // Cursor pour pagination (lastDoc.id)
}

/**
 * Paramètres de tri
 */
export interface SortParams {
  sortBy: 'date' | 'alphabetical' // Type de tri
  sortOrder: 'asc' | 'desc' // Ordre (croissant/décroissant)
}

/**
 * Résultat paginé avec métadonnées
 */
export interface PaginatedDemands {
  items: import('./demand.types').CaisseImprevueDemand[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
    nextCursor?: string
    previousCursor?: string
  }
}

/**
 * Statistiques des demandes (globales, indépendantes des filtres de statut)
 */
export interface DemandStats {
  total: number
  pending: number
  approved: number
  rejected: number
  converted: number
  reopened: number
  // Stats par fréquence de paiement
  daily: number // Nombre de demandes avec fréquence DAILY (quotidienne)
  monthly: number // Nombre de demandes avec fréquence MONTHLY (mensuelle)
}
