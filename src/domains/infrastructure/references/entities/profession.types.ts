/**
 * Types et interfaces pour le domaine Professions (Métiers)
 * 
 * Ce fichier contient toutes les définitions de types liées aux professions :
 * - Profession (entité principale)
 * - ProfessionSearchResult (résultat de recherche)
 */

/**
 * Entité Profession (Métier)
 */
export interface Profession {
  id: string
  name: string
  normalizedName: string // Nom normalisé pour la recherche
  category?: string
  description?: string
  createdAt: Date
  updatedAt: Date
  createdBy: string // ID de l'administrateur qui a créé
}

/**
 * Résultat de recherche de profession
 */
export interface ProfessionSearchResult {
  found: boolean
  profession?: Profession
  suggestions?: string[] // Suggestions si pas trouvé
}

/**
 * Filtres pour la pagination des professions
 */
export interface ProfessionFilters {
  search?: string
}

/**
 * Résultat paginé des professions
 */
export interface PaginatedProfessions {
  data: Profession[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}
