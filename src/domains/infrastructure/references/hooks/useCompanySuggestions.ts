/**
 * @module useCompanySuggestions
 * Hook React Query pour la gestion des suggestions d'entreprises avec cache intelligent
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { CompanySearchResult } from '../entities/company.types'

export interface CompanySuggestion {
  name: string
  isNew: boolean
  hasAddress?: boolean
  id?: string
  industry?: string
}

interface UseCompanySuggestionsOptions {
  query: string
  enabled?: boolean
  staleTime?: number
}

/**
 * Hook principal pour les suggestions d'entreprises
 */
export function useCompanySuggestions({ 
  query, 
  enabled = true, 
  staleTime = 5 * 60 * 1000 // 5 minutes par défaut
}: UseCompanySuggestionsOptions) {
  
  const queryClient = useQueryClient()
  const companySuggestionsService = ServiceFactory.getCompanySuggestionsService()
  
  // Query pour récupérer les entreprises depuis Firebase
  const { 
    data: suggestions, 
    isLoading, 
    error,
    isFetching,
    refetch
  } = useQuery<CompanySuggestion[]>({
    queryKey: ['company-suggestions', query.toLowerCase().trim()],
    queryFn: () => companySuggestionsService.searchCompanies(query),
    enabled: enabled && query.length >= 2,
    staleTime,
    gcTime: 30 * 60 * 1000, // 30 minutes en cache
    refetchOnWindowFocus: false,
    retry: 2,
  })

  // Fonction pour précharger les suggestions populaires
  const prefetchPopularCompanies = useCallback(async () => {
    const popularQueries = ['Total', 'Ministère', 'Banque', 'Hôpital', 'École']
    
    await Promise.all(
      popularQueries.map(query => 
        queryClient.prefetchQuery({
          queryKey: ['company-suggestions', query.toLowerCase()],
          queryFn: () => companySuggestionsService.searchCompanies(query),
          staleTime: 10 * 60 * 1000, // 10 minutes pour les entreprises populaires
        })
      )
    )
  }, [queryClient, companySuggestionsService])

  // Fonction pour invalider le cache des suggestions
  const invalidateSuggestions = useCallback(() => {
    queryClient.invalidateQueries({ 
      queryKey: ['company-suggestions'] 
    })
  }, [queryClient])

  // Fonction pour mettre à jour le cache avec une nouvelle entreprise
  const updateCacheWithNewCompany = useCallback((newCompany: { name: string; id: string; industry?: string }) => {
    const queryKey = ['company-suggestions', newCompany.name.toLowerCase()]
    
    queryClient.setQueryData(queryKey, (oldData: CompanySuggestion[] | undefined) => {
      if (!oldData) return oldData
      
      return [
        {
          name: newCompany.name,
          isNew: false,
          hasAddress: false,
          id: newCompany.id,
          industry: newCompany.industry
        },
        ...oldData.filter(s => s.name !== `Créer "${newCompany.name}"`)
      ]
    })
  }, [queryClient])

  return {
    suggestions: suggestions || [],
    isLoading,
    isFetching,
    error,
    refetch,
    prefetchPopularCompanies,
    invalidateSuggestions,
    updateCacheWithNewCompany,
    hasData: Boolean(suggestions),
    totalSuggestions: suggestions?.length || 0
  }
}
