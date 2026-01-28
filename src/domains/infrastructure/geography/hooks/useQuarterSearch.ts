/**
 * Hook pour rechercher des quarters avec debounce et cache
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
import type { Quarter } from '../entities/geography.types'

export interface UseQuarterSearchOptions {
  /**
   * ID du district dans lequel rechercher
   * Requis pour activer la recherche
   */
  districtId: string | null | undefined
  
  /**
   * Délai de debounce en millisecondes (défaut: 300ms)
   */
  debounceDelay?: number
  
  /**
   * Limite de résultats (défaut: 50)
   */
  limit?: number
}

export interface UseQuarterSearchReturn {
  /**
   * Terme de recherche actuel
   */
  searchTerm: string
  
  /**
   * Fonction pour mettre à jour le terme de recherche
   */
  setSearchTerm: (term: string) => void
  
  /**
   * Quarters trouvés (triés alphabétiquement)
   */
  quarters: Quarter[]
  
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
 * Hook pour rechercher des quarters avec debounce et cache React Query
 * 
 * @example
 * ```tsx
 * const { searchTerm, setSearchTerm, quarters, isLoading } = useQuarterSearch({
 *   districtId: selectedDistrictId
 * })
 * 
 * <CommandInput 
 *   value={searchTerm}
 *   onValueChange={setSearchTerm}
 *   placeholder="Rechercher un quartier (min 2 caractères)..."
 * />
 * ```
 */
export function useQuarterSearch({
  districtId,
  debounceDelay = 300,
  limit = 50,
}: UseQuarterSearchOptions): UseQuarterSearchReturn {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, debounceDelay)
  
  const { data: quarters = [], isLoading, error } = useQuery<Quarter[]>({
    queryKey: ['quarters', 'search', debouncedSearch, districtId],
    queryFn: async () => {
      if (debouncedSearch.trim().length < 2 || !districtId) {
        return []
      }
      
      const service = ServiceFactory.getGeographieService()
      const results = await service.searchQuartersWithLimit({
        search: debouncedSearch.trim(),
        districtId,
        limit,
      })
      
      // Tri alphabétique (déjà fait dans le service, mais on s'assure)
      return results.sort((a, b) => 
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      )
    },
    enabled: debouncedSearch.trim().length >= 2 && !!districtId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (anciennement cacheTime)
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  
  return {
    searchTerm,
    setSearchTerm,
    quarters,
    isLoading,
    error: error as Error | null,
  }
}
