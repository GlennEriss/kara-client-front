/**
 * Types pour la pagination côté serveur
 * Utilisation avec Firestore startAfter() + limit()
 */

/**
 * Options de pagination pour les requêtes
 */
export interface PaginationOptions {
  /** Nombre d'éléments par page (default: 20) */
  pageSize?: number
  /** Curseur pour la pagination (documentId du dernier élément) */
  cursor?: string | null
  /** Direction de la pagination */
  direction?: 'next' | 'prev'
}

/**
 * Options de recherche et filtrage
 */
export interface SearchOptions {
  /** Terme de recherche */
  search?: string
  /** ID du parent pour filtrer (ex: provinceId pour départements) */
  parentId?: string
  /** Champ de tri */
  orderBy?: string
  /** Direction du tri */
  orderDirection?: 'asc' | 'desc'
}

/**
 * Résultat paginé générique
 */
export interface PaginatedResult<T> {
  /** Données de la page courante */
  data: T[]
  /** Métadonnées de pagination */
  pagination: {
    /** Curseur pour la page suivante (null si dernière page) */
    nextCursor: string | null
    /** Curseur pour la page précédente (null si première page) */
    prevCursor: string | null
    /** Y a-t-il une page suivante */
    hasNextPage: boolean
    /** Y a-t-il une page précédente */
    hasPrevPage: boolean
    /** Nombre total d'éléments (approximatif, peut être null si trop coûteux) */
    totalCount?: number
    /** Taille de la page */
    pageSize: number
  }
}

/**
 * Options combinées pour les requêtes paginées avec recherche
 */
export interface QueryOptions extends PaginationOptions, SearchOptions {}

/**
 * Cache de comptage pour éviter les requêtes répétées
 */
export interface CountCache {
  count: number
  timestamp: number
  /** Durée de validité en ms (default: 5 min) */
  ttl: number
}
