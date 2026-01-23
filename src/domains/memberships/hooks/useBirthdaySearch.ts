/**
 * Hook React Query pour la recherche Algolia des anniversaires
 * 
 * Gère la recherche Algolia pour trouver un membre et son mois d'anniversaire.
 * Utilisé pour la navigation automatique vers le mois d'anniversaire.
 * 
 * TODO: Implémenter BirthdaysAlgoliaService.search()
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import type { BirthdaySearchResult, BirthdaySearchHit } from '../types/birthdays'

export interface UseBirthdaySearchOptions {
  query: string
  enabled?: boolean
}

export interface UseBirthdaySearchReturn {
  hits: BirthdaySearchHit[]
  isLoading: boolean
  isError: boolean
  error: unknown
  targetMonth: number | null // mois du premier résultat pour navigation
}

import { BirthdaysAlgoliaService } from '../services/BirthdaysAlgoliaService'

export function useBirthdaySearch(
  options: UseBirthdaySearchOptions,
): UseBirthdaySearchReturn {
  const { query, enabled = true } = options

  // Clé de cache unique pour cette recherche
  const queryKey = ['birthdays', 'search', query]

  // Requête principale
  const queryResult = useQuery<BirthdaySearchResult>({
    queryKey,
    queryFn: async () => {
      try {
        return await BirthdaysAlgoliaService.search(query)
      } catch (error) {
        console.error('[useBirthdaySearch] Erreur Algolia:', error)
        // Retourner un résultat vide en cas d'erreur plutôt que de faire échouer la requête
        return {
          hits: [],
          targetMonth: null,
        }
      }
    },
    enabled: enabled && query.length >= 2, // Ne pas rechercher si moins de 2 caractères
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: false, // Ne pas réessayer en cas d'erreur
  })

  // Extraire le targetMonth du premier résultat
  const targetMonth = queryResult.data?.hits[0]?.birthMonth || null

  return {
    hits: queryResult.data?.hits ?? [],
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    targetMonth,
  }
}
