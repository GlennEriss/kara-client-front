/**
 * Services de recherche Algolia
 * 
 * Export centralisé des services de recherche pour:
 * - membership-requests (demandes d'adhésion)
 * - members (membres validés / collection users)
 */

// Service pour les demandes d'adhésion (membership-requests)
export {
  AlgoliaSearchService,
  getAlgoliaSearchService,
  type SearchOptions,
  type SearchResult,
} from './AlgoliaSearchService'

// Service pour les membres (users)
export {
  MembersAlgoliaSearchService,
  getMembersAlgoliaSearchService,
  resetMembersAlgoliaSearchService,
  type MembersSearchOptions,
  type MembersSearchFilters,
  type MembersSearchResult,
  type MembersSearchPagination,
  type MembersSortBy,
} from './MembersAlgoliaSearchService'
