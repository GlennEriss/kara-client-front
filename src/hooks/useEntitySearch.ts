import { useState, useCallback, useEffect } from 'react'
import { EntitySearchResult, EntitySearchFilters } from '@/types/types'
import { useDebounce } from './useDebounce'
import { searchUsers } from '@/db/user.db'
import { searchGroups } from '@/db/group.db'

// Interface pour les résultats de recherche avec pagination
interface SearchResults {
  results: EntitySearchResult[]
  total: number
  hasMore: boolean
}

// Hook personnalisé pour la recherche d'entités
export function useEntitySearch(contractType?: 'INDIVIDUAL' | 'GROUP') {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'member' | 'group' | 'both'>(() => {
    // Déterminer le type de recherche selon le type de contrat
    if (contractType === 'INDIVIDUAL') return 'member'
    if (contractType === 'GROUP') return 'group'
    return 'both'
  })
  const [results, setResults] = useState<EntitySearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [limit] = useState(20)

  // Debounce de la recherche
  const debouncedQuery = useDebounce(searchQuery, 300)

  // Fonction de recherche
  const searchEntities = useCallback(async (query: string, type: 'member' | 'group' | 'both', page: number = 1) => {
    if (!query || query.trim().length < 2) {
      setResults([])
      setTotal(0)
      setHasMore(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('🔍 Début de la recherche:', { query, type, page })
      const results: EntitySearchResult[] = []
      
      // Rechercher les membres si nécessaire
      if (type === 'member' || type === 'both') {
        try {
          console.log('👥 Recherche des membres...')
          const users = await searchUsers(query, limit)
          console.log('✅ Membres trouvés:', users.length, users)
          const memberResults: EntitySearchResult[] = users.map(user => ({
            id: user.id,
            displayName: `${user.firstName} ${user.lastName}`,
            type: 'member' as const,
            additionalInfo: `Matricule: ${user.matricule}`,
            photoURL: user.photoURL || undefined,
            contacts: user.contacts || []
          }))
          results.push(...memberResults)
        } catch (err) {
          console.error('❌ Erreur lors de la recherche des membres:', err)
        }
      }
      
      // Rechercher les groupes si nécessaire
      if (type === 'group' || type === 'both') {
        try {
          console.log('👥 Recherche des groupes...')
          const groups = await searchGroups(query, limit)
          console.log('✅ Groupes trouvés:', groups.length, groups)
          const groupResults: EntitySearchResult[] = groups.map(group => ({
            id: group.id,
            displayName: group.name,
            type: 'group' as const,
            additionalInfo: group.description || `Groupe créé le ${group.createdAt.toLocaleDateString('fr-FR')}`,
            photoURL: undefined,
            contacts: []
          }))
          results.push(...groupResults)
        } catch (err) {
          console.error('❌ Erreur lors de la recherche des groupes:', err)
        }
      }
      
      console.log('📊 Résultats totaux:', results.length)
      
      // Pagination simple côté client
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedResults = results.slice(startIndex, endIndex)
      
      if (page === 1) {
        setResults(paginatedResults)
      } else {
        setResults(prev => [...prev, ...paginatedResults])
      }
      
      setTotal(results.length)
      setHasMore(endIndex < results.length)
      setCurrentPage(page)
    } catch (err) {
      console.error('❌ Erreur générale lors de la recherche:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la recherche')
      setResults([])
      setTotal(0)
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [limit])

  // Effect pour déclencher la recherche quand la requête change
  useEffect(() => {
    if (debouncedQuery) {
      setCurrentPage(1)
      searchEntities(debouncedQuery, searchType, 1)
    } else {
      setResults([])
      setTotal(0)
      setHasMore(false)
    }
  }, [debouncedQuery, searchType, searchEntities])

  // Effect pour mettre à jour le type de recherche quand le type de contrat change
  useEffect(() => {
    const newSearchType = contractType === 'INDIVIDUAL' ? 'member' : contractType === 'GROUP' ? 'group' : 'both'
    if (newSearchType !== searchType) {
      console.log('🔄 Changement du type de recherche:', { from: searchType, to: newSearchType, contractType })
      setSearchType(newSearchType)
      setCurrentPage(1)
      if (debouncedQuery) {
        searchEntities(debouncedQuery, newSearchType, 1)
      }
    }
  }, [contractType, searchType, debouncedQuery, searchEntities])

  // Fonction pour charger plus de résultats
  const loadMore = useCallback(() => {
    if (hasMore && !isLoading && debouncedQuery) {
      searchEntities(debouncedQuery, searchType, currentPage + 1)
    }
  }, [hasMore, isLoading, debouncedQuery, searchType, currentPage, searchEntities])

  // Fonction pour changer le type de recherche
  const changeSearchType = useCallback((type: 'member' | 'group' | 'both') => {
    setSearchType(type)
    setCurrentPage(1)
    if (debouncedQuery) {
      searchEntities(debouncedQuery, type, 1)
    }
  }, [debouncedQuery, searchEntities])

  // Fonction pour réinitialiser la recherche
  const resetSearch = useCallback(() => {
    setSearchQuery('')
    setSearchType(contractType === 'INDIVIDUAL' ? 'member' : contractType === 'GROUP' ? 'group' : 'both')
    setResults([])
    setTotal(0)
    setHasMore(false)
    setCurrentPage(1)
    setError(null)
  }, [contractType])

  return {
    // État
    searchQuery,
    searchType,
    results,
    isLoading,
    error,
    total,
    hasMore,
    currentPage,
    
    // Actions
    setSearchQuery,
    changeSearchType,
    loadMore,
    resetSearch,
    searchEntities
  }
}


