/**
 * Hook pour rechercher des communes avec debounce et cache
 * 
 * Stratégie : Recherche uniquement (pas de chargement complet)
 * - Minimum 2 caractères pour activer la recherche
 * - Debounce 300ms
 * - Limite 50 résultats
 * - Cache 5 minutes par terme de recherche
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useDebounce } from '@/hooks/useDebounce'
import type { Commune } from '../entities/geography.types'

export interface UseCommuneSearchOptions {
  /**
   * IDs des départements dans lesquels rechercher
   * Si vide, recherche dans toutes les communes
   */
  departmentIds: string[]
  
  /**
   * Délai de debounce en millisecondes (défaut: 300ms)
   */
  debounceDelay?: number
  
  /**
   * Limite de résultats (défaut: 50)
   */
  limit?: number
}

export interface UseCommuneSearchReturn {
  /**
   * Terme de recherche actuel
   */
  searchTerm: string
  
  /**
   * Fonction pour mettre à jour le terme de recherche
   */
  setSearchTerm: (term: string) => void
  
  /**
   * Communes trouvées (triées alphabétiquement)
   */
  communes: Commune[]
  
  /**
   * État de chargement
   */
  isLoading: boolean
  
  /**
   * Erreur éventuelle
   */
  error: Error | null
}

/**
 * Hook pour rechercher des communes avec debounce et cache React Query
 * 
 * @example
 * ```tsx
 * const { searchTerm, setSearchTerm, communes, isLoading } = useCommuneSearch({
 *   departmentIds: ['dept-1', 'dept-2']
 * })
 * 
 * <CommandInput 
 *   value={searchTerm}
 *   onValueChange={setSearchTerm}
 *   placeholder="Rechercher une commune (min 2 caractères)..."
 * />
 * ```
 */
export function useCommuneSearch({
  departmentIds,
  debounceDelay = 300,
  limit = 50,
}: UseCommuneSearchOptions): UseCommuneSearchReturn {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, debounceDelay)
  
  const { data: communes = [], isLoading, error } = useQuery<Commune[]>({
    queryKey: ['communes', 'search', debouncedSearch, departmentIds.sort().join(',')],
    queryFn: async () => {
      if (debouncedSearch.trim().length < 2) {
        return []
      }
      
      const service = ServiceFactory.getGeographieService()
      const results = await service.searchCommunesWithLimit({
        search: debouncedSearch.trim(),
        departmentIds: departmentIds.length > 0 ? departmentIds : undefined,
        limit,
      })
      
      // Tri alphabétique (déjà fait dans le service, mais on s'assure)
      return results.sort((a, b) => 
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      )
    },
    enabled: debouncedSearch.trim().length >= 2 && departmentIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (anciennement cacheTime)
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  
  return {
    searchTerm,
    setSearchTerm,
    communes,
    isLoading,
    error: error as Error | null,
  }
}
