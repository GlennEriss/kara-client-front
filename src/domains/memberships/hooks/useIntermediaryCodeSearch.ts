/**
 * Hook React Query pour la recherche du code entremetteur avec autocomplétion
 * 
 * Utilise Algolia pour rechercher des membres par nom/prénom et afficher
 * leurs codes entremetteurs dans un composant Combobox.
 * 
 * Cache intelligent : Les recherches identiques utilisent le cache React Query
 * pour éviter les recherches redondantes (ex: "Glenn" → Efface → "Glenn" = Cache HIT)
 * 
 * @see cache-strategy.md pour la stratégie de cache détaillée
 */

'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getMembersAlgoliaSearchService,
  type MembersSearchOptions,
} from '@/services/search/MembersAlgoliaSearchService'
import type { User } from '@/types/types'
import { formatIntermediaryDisplay, extractIntermediaryCode } from '../utils/formatIntermediaryDisplay'

export interface UseIntermediaryCodeSearchOptions {
  /** Terme de recherche (nom ou prénom) */
  query?: string
  /** Activer/désactiver la requête */
  enabled?: boolean
}

export interface IntermediarySearchResult {
  /** Membre trouvé */
  member: User
  /** Affichage formaté : "Nom Prénom (Code)" */
  displayName: string
  /** Code entremetteur (matricule) */
  code: string
}

export interface UseIntermediaryCodeSearchResult {
  /** Résultats formatés pour l'affichage */
  results: IntermediarySearchResult[]
  /** Indique si la recherche est en cours */
  isLoading: boolean
  /** Indique si une erreur s'est produite */
  isError: boolean
  /** Erreur éventuelle */
  error: Error | null
  /** Indique si la recherche est en cours de fetch */
  isFetching: boolean
}

/**
 * Hook pour rechercher des membres entremetteurs via Algolia
 * 
 * @param options - Options de recherche
 * @returns Résultat de la requête avec résultats formatés
 * 
 * @example
 * ```tsx
 * const { results, isLoading } = useIntermediaryCodeSearch({ query: 'Jean' })
 * 
 * // results = [
 * //   { member: {...}, displayName: "Dupont Jean (1228.MK.0058)", code: "1228.MK.0058" },
 * //   { member: {...}, displayName: "Martin Jean (1234.MK.0059)", code: "1234.MK.0059" }
 * // ]
 * ```
 */
export function useIntermediaryCodeSearch(
  options: UseIntermediaryCodeSearchOptions = {}
): UseIntermediaryCodeSearchResult {
  const { query = '', enabled = true } = options

  const searchService = getMembersAlgoliaSearchService()

  // Construire les options de recherche Algolia
  const searchOptions: MembersSearchOptions = {
    query: query.trim(),
    filters: {
      isActive: true, // Seulement les membres actifs
    },
    page: 1,
    hitsPerPage: 10, // Maximum 10 résultats
    sortBy: 'created_desc', // Tri par date de création (peut être changé si nécessaire)
  }

  // Vérifier si Algolia est disponible
  const isAlgoliaAvailable = searchService.isAvailable()

  // Requête React Query avec cache intelligent
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: [
      'intermediary-code-search',
      {
        query: query.trim(),
        filters: { isActive: true },
        hitsPerPage: 10,
      },
    ],
    queryFn: async () => {
      // Double vérification avant d'appeler Algolia
      if (!searchService.isAvailable()) {
        throw new Error('Service de recherche non configuré. Veuillez contacter l\'administrateur.')
      }
      
      try {
        const result = await searchService.search(searchOptions)
        return result
      } catch (error: any) {
        // Améliorer le message d'erreur pour les erreurs Algolia
        if (error?.message?.includes('Unreachable hosts') || error?.message?.includes('application id')) {
          throw new Error('Service de recherche temporairement indisponible. Veuillez réessayer plus tard.')
        }
        throw error
      }
    },
    enabled: enabled && isAlgoliaAvailable && query.trim().length >= 2, // Seulement si >= 2 caractères
    retry: false, // Ne pas réessayer automatiquement en cas d'erreur
    staleTime: 5 * 60 * 1000, // 5 minutes - Les résultats restent "frais" pendant 5 min
    gcTime: 10 * 60 * 1000, // 10 minutes - Le cache est gardé en mémoire pendant 10 min
    refetchOnWindowFocus: false, // Ne pas refetch au focus de la fenêtre
    refetchOnMount: false, // Ne pas refetch au remount
    refetchOnReconnect: false, // Ne pas refetch à la reconnexion
    // Optimisation : utiliser le cache immédiatement si disponible
    placeholderData: (previousData) => previousData, // Garder les données précédentes pendant le chargement
  })

  // Formater les résultats pour l'affichage (memoized pour éviter les recalculs)
  const results: IntermediarySearchResult[] = useMemo(() => {
    if (!data?.items) return []
    return data.items.map((member) => ({
      member,
      displayName: formatIntermediaryDisplay(member),
      code: extractIntermediaryCode(member),
    }))
  }, [data?.items])

  return {
    results,
    isLoading,
    isError,
    error: error as Error | null,
    isFetching,
  }
}
