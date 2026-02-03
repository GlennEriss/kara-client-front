/**
 * Repository V2 pour les membres (users)
 *
 * Utilise Algolia pour les recherches textuelles (searchQuery) et Firestore
 * pour les requêtes sans recherche textuelle.
 *
 * Stratégie hybride :
 * - Si `filters.searchQuery` existe → Algolia (recherche full-text optimisée)
 * - Sinon → Firestore (requêtes indexées classiques)
 *
 * Mapping des filtres vers Algolia :
 * - Filtres facets (filtrage précis) : membershipType, roles, isActive, gender, hasCar,
 *   province, city, arrondissement, companyId, professionId
 * - Recherche textuelle (dans searchableText) : searchQuery, companyName, profession, district
 * - Tri : orderByField/orderByDirection → sortBy (name_asc ou created_desc)
 *
 * Note: companyName, profession et district sont ajoutés à la query de recherche
 * (recherche textuelle) car ils sont dans searchableText mais ne sont pas des facets.
 * Pour un filtrage précis, utiliser companyId et professionId (à ajouter à UserFilters si nécessaire).
 */

import type { UserFilters, MembershipType } from '@/types/types'
import type { PaginatedMembers } from '@/db/member.db'
import { getMembers, getMemberWithSubscription } from '@/db/member.db'
import { getUserById } from '@/db/user.db'
import type { User } from '@/types/types'
import type { DocumentSnapshot } from 'firebase/firestore'
import {
  getMembersAlgoliaSearchService,
  type MembersSearchFilters,
  type MembersSortBy,
} from '@/services/search/MembersAlgoliaSearchService'

export class MembersRepositoryV2 {
  private static instance: MembersRepositoryV2

  private constructor() {}

  static getInstance(): MembersRepositoryV2 {
    if (!MembersRepositoryV2.instance) {
      MembersRepositoryV2.instance = new MembersRepositoryV2()
    }
    return MembersRepositoryV2.instance
  }

  /**
   * Récupère un membre par son id (document users / uid Firebase Auth).
   */
  async getById(memberId: string): Promise<User | null> {
    return getUserById(memberId)
  }

  /**
   * Récupère les membres avec pagination
   * 
   * Utilise Algolia si une recherche textuelle est présente, sinon Firestore.
   */
  async getAll(
    filters: UserFilters = {},
    page: number = 1,
    limit: number = 12,
    cursor?: DocumentSnapshot | null,
  ): Promise<PaginatedMembers> {
    // Si une recherche textuelle est présente, utiliser Algolia
    if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
      return this.getAllWithAlgolia(filters, page, limit)
    }

    // Sinon, utiliser Firestore (comportement existant)
    // Note: cursor n'est pas supporté avec Algolia, donc on l'utilise uniquement avec Firestore
    return getMembers(filters, page, limit, cursor || undefined)
  }

  /**
   * Récupère les membres via Algolia (recherche textuelle)
   */
  private async getAllWithAlgolia(
    filters: UserFilters,
    page: number,
    limit: number,
  ): Promise<PaginatedMembers> {
    try {
      const algoliaService = getMembersAlgoliaSearchService()

      // Vérifier si Algolia est disponible
      if (!algoliaService.isAvailable()) {
        console.warn('[MembersRepositoryV2] Algolia non disponible, fallback vers Firestore')
        return getMembers(filters, page, limit)
      }

      // Construire la query de recherche Algolia
      // Combiner searchQuery avec companyName, profession et district
      // (ces champs sont dans searchableText, donc recherche textuelle)
      const queryParts: string[] = []
      
      if (filters.searchQuery) {
        queryParts.push(filters.searchQuery.trim())
      }
      
      // Ajouter companyName, profession et district à la query (recherche textuelle dans searchableText)
      // plutôt que dans les filtres (car ils ne sont pas des facets dans Algolia)
      // Note: Pour un filtrage précis, utiliser les IDs (companyId, professionId) comme filtres
      if (filters.companyName) {
        queryParts.push(filters.companyName.trim())
      }
      
      if (filters.profession) {
        queryParts.push(filters.profession.trim())
      }
      
      if (filters.district) {
        queryParts.push(filters.district.trim())
      }
      
      const algoliaQuery = queryParts.join(' ').trim()

      // Mapper UserFilters vers MembersSearchFilters (filtres Algolia)
      const algoliaFilters: MembersSearchFilters = {}

      // Type de membre (prendre le premier si array)
      // Note: Algolia ne supporte qu'un seul membershipType à la fois dans les filtres
      // Si plusieurs types sont sélectionnés, on prend le premier
      if (filters.membershipType && filters.membershipType.length > 0) {
        algoliaFilters.membershipType = filters.membershipType[0] as MembershipType
      }

      // Rôles
      if (filters.roles && filters.roles.length > 0) {
        algoliaFilters.roles = filters.roles
      }

      // Statut actif
      if (filters.isActive !== undefined) {
        algoliaFilters.isActive = filters.isActive
      }

      // Possession de voiture
      if (filters.hasCar !== undefined) {
        algoliaFilters.hasCar = filters.hasCar
      }

      // Adresse (filtres géographiques)
      if (filters.province) {
        algoliaFilters.province = filters.province
      }
      if (filters.city) {
        algoliaFilters.city = filters.city
      }
      if (filters.arrondissement) {
        algoliaFilters.arrondissement = filters.arrondissement
      }

      // Note: companyName et profession sont ajoutés à la query (recherche textuelle)
      // car ils sont dans searchableText. Pour un filtrage précis par ID, il faudrait
      // ajouter companyId et professionId à UserFilters et les utiliser ici comme filtres (facets)

      // Déterminer le tri
      let sortBy: MembersSortBy = 'created_desc'
      if (filters.orderByField === 'lastName' && filters.orderByDirection === 'asc') {
        sortBy = 'name_asc'
      }

      // Recherche Algolia
      const searchResult = await algoliaService.search({
        query: algoliaQuery || '', // Query combinée (searchQuery + companyName + profession)
        filters: algoliaFilters,
        page,
        hitsPerPage: limit,
        sortBy,
      })

      // ⚠️ IMPORTANT : Enrichir les résultats avec les abonnements
      // Les résultats Algolia sont des User[] de base, il faut les enrichir
      // avec lastSubscription et isSubscriptionValid comme dans getMembers()
      const membersWithSubscriptions = await Promise.all(
        searchResult.items.map(user => getMemberWithSubscription(user.id))
      )

      // Filtrer les null et préserver l'ordre Algolia
      const enrichedMembers = membersWithSubscriptions.filter(
        (member): member is NonNullable<typeof member> => member !== null
      )

      // Convertir le résultat Algolia vers PaginatedMembers
      return {
        data: enrichedMembers,
        pagination: {
          currentPage: searchResult.pagination.page,
          totalPages: searchResult.pagination.totalPages,
          totalItems: searchResult.pagination.totalItems,
          itemsPerPage: searchResult.pagination.limit,
          hasNextPage: searchResult.pagination.hasNextPage,
          hasPrevPage: searchResult.pagination.hasPrevPage,
          nextCursor: null, // Algolia utilise la pagination par page, pas de curseur
          prevCursor: null, // Algolia utilise la pagination par page, pas de curseur
        },
      }
    } catch (error) {
      console.error('[MembersRepositoryV2] Erreur lors de la recherche Algolia, fallback vers Firestore:', error)
      // Fallback vers Firestore en cas d'erreur Algolia
      return getMembers(filters, page, limit)
    }
  }
}
