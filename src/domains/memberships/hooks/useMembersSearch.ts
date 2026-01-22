/**
 * Hook React Query pour la recherche Algolia des membres (collection users)
 * 
 * Utilise MembersAlgoliaSearchService pour effectuer des recherches avancées
 * avec filtres et pagination.
 * 
 * Note: Ce hook est utilisé pour les recherches textuelles. Pour les listes
 * sans recherche, utiliser useMembershipsListV2 qui utilise MembersRepositoryV2
 * (qui choisit automatiquement entre Algolia et Firestore).
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import {
  getMembersAlgoliaSearchService,
  type MembersSearchOptions,
  type MembersSearchFilters,
  type MembersSortBy,
} from '@/services/search/MembersAlgoliaSearchService'
import type { UserFilters, MembershipType, UserRole } from '@/types/types'

export interface UseMembersSearchOptions {
  /** Terme de recherche textuelle (nom, prénom, matricule, email, téléphone, etc.) */
  query?: string
  /** Filtres à appliquer */
  filters?: {
    membershipType?: MembershipType
    roles?: UserRole[]
    isActive?: boolean
    gender?: 'M' | 'F'
    hasCar?: boolean
    province?: string
    city?: string
    arrondissement?: string
    companyId?: string
    companyName?: string
    professionId?: string
    profession?: string
  }
  /** Numéro de page (1-based) */
  page?: number
  /** Nombre de résultats par page */
  hitsPerPage?: number
  /** Tri des résultats */
  sortBy?: MembersSortBy
  /** Activer/désactiver la requête */
  enabled?: boolean
}

/**
 * Hook pour rechercher des membres via Algolia
 * 
 * @param options - Options de recherche
 * @returns Résultat de la requête React Query avec les items et la pagination
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useMembersSearch({
 *   query: 'jean dupont',
 *   filters: { membershipType: 'adherant', isActive: true },
 *   page: 1,
 *   hitsPerPage: 20,
 * })
 * 
 * // data.items: User[]
 * // data.pagination: { page, totalPages, totalItems, ... }
 * ```
 */
export function useMembersSearch(options: UseMembersSearchOptions = {}) {
  const {
    query = '',
    filters = {},
    page = 1,
    hitsPerPage = 20,
    sortBy = 'created_desc',
    enabled = true,
  } = options

  const searchService = getMembersAlgoliaSearchService()

  // Construire les options de recherche Algolia
  const searchOptions: MembersSearchOptions = {
    query: query.trim(),
    filters: {
      membershipType: filters.membershipType,
      roles: filters.roles,
      isActive: filters.isActive,
      gender: filters.gender,
      hasCar: filters.hasCar,
      province: filters.province,
      city: filters.city,
      arrondissement: filters.arrondissement,
      companyId: filters.companyId,
      companyName: filters.companyName,
      professionId: filters.professionId,
      profession: filters.profession,
    },
    page,
    hitsPerPage,
    sortBy,
  }

  // Vérifier si Algolia est disponible
  const isAlgoliaAvailable = searchService.isAvailable()

  return useQuery({
    queryKey: ['members-search', searchOptions],
    queryFn: () => searchService.search(searchOptions),
    staleTime: 30 * 1000, // 30 secondes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: enabled && isAlgoliaAvailable && (query.trim().length >= 2 || query.trim().length === 0), // Activer seulement si query >= 2 caractères ou vide, et si Algolia est disponible
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook pour rechercher des membres avec des filtres UserFilters (compatibilité)
 * 
 * Convertit UserFilters en MembersSearchFilters pour utiliser Algolia.
 * 
 * @param filters - Filtres UserFilters
 * @param page - Numéro de page
 * @param limit - Nombre de résultats par page
 * @param enabled - Activer/désactiver la requête
 * @returns Résultat de la requête React Query
 */
export function useMembersSearchWithUserFilters(
  filters: UserFilters = {},
  page: number = 1,
  limit: number = 20,
  enabled: boolean = true,
) {
  // Mapper UserFilters vers MembersSearchFilters
  const searchFilters: MembersSearchFilters = {}

  // Type de membre (prendre le premier si array)
  if (filters.membershipType && filters.membershipType.length > 0) {
    searchFilters.membershipType = filters.membershipType[0] as MembershipType
  }

  // Rôles
  if (filters.roles && filters.roles.length > 0) {
    searchFilters.roles = filters.roles
  }

  // Statut actif
  if (filters.isActive !== undefined) {
    searchFilters.isActive = filters.isActive
  }

  // Possession de voiture
  if (filters.hasCar !== undefined) {
    searchFilters.hasCar = filters.hasCar
  }

  // Adresse
  if (filters.province) {
    searchFilters.province = filters.province
  }
  if (filters.city) {
    searchFilters.city = filters.city
  }
  if (filters.arrondissement) {
    searchFilters.arrondissement = filters.arrondissement
  }

  // Professionnels
  if (filters.companyName) {
    searchFilters.companyName = filters.companyName
  }
  if (filters.profession) {
    searchFilters.profession = filters.profession
  }

  // Déterminer le tri
  let sortBy: MembersSortBy = 'created_desc'
  if (filters.orderByField === 'lastName' && filters.orderByDirection === 'asc') {
    sortBy = 'name_asc'
  }

  return useMembersSearch({
    query: filters.searchQuery,
    filters: searchFilters,
    page,
    hitsPerPage: limit,
    sortBy,
    enabled,
  })
}
