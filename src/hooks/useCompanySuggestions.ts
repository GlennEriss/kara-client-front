/**
 * @module useCompanySuggestions
 * Hook React Query pour la gestion des suggestions d'entreprises avec cache intelligent
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { ServiceFactory } from '@/factories/ServiceFactory'
import type { CompanySearchResult } from '@/domains/infrastructure/references/entities/company.types'

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
  
  // Query pour récupérer les entreprises depuis Firebase
  const { 
    data: companyData, 
    isLoading, 
    error,
    isFetching,
    refetch
  } = useQuery<CompanySearchResult>({
    queryKey: ['company-suggestions', query.toLowerCase().trim()],
    queryFn: async () => {
      const companyService = ServiceFactory.getCompanyService()
      return companyService.findByName(query)
    },
    enabled: enabled && query.length >= 2,
    staleTime,
    gcTime: 30 * 60 * 1000, // 30 minutes en cache
    refetchOnWindowFocus: false,
    retry: 2,
  })

  // Transformation des données en suggestions formatées
  const suggestions = useMemo<CompanySuggestion[]>(() => {
    if (!companyData) return []
    
    const formattedSuggestions: CompanySuggestion[] = []
    
    // Ajouter l'entreprise trouvée
    if (companyData.found && companyData.company) {
      formattedSuggestions.push({
        name: companyData.company.name,
        isNew: false,
        hasAddress: Boolean(companyData.company.address),
        id: companyData.company.id,
        industry: companyData.company.industry
      })
    }
    
    // Ajouter les suggestions si disponibles
    if (companyData.suggestions) {
      companyData.suggestions.forEach((suggestion: string) => {
        formattedSuggestions.push({
          name: suggestion,
          isNew: false,
          hasAddress: false
        })
      })
    }
    
    // Ajouter l'option "Créer nouvelle entreprise"
    if (query.length >= 2) {
      formattedSuggestions.push({
        name: `Créer "${query}"`,
        isNew: true,
        hasAddress: false
      })
    }
    
    return formattedSuggestions
  }, [companyData, query])

  // Fonction pour précharger les suggestions populaires
  const prefetchPopularCompanies = useCallback(async () => {
    const popularQueries = ['Total', 'Ministère', 'Banque', 'Hôpital', 'École']
    
    await Promise.all(
      popularQueries.map(query => 
        queryClient.prefetchQuery({
          queryKey: ['company-suggestions', query.toLowerCase()],
          queryFn: async () => {
            const companyService = ServiceFactory.getCompanyService()
            return companyService.findByName(query)
          },
          staleTime: 10 * 60 * 1000, // 10 minutes pour les entreprises populaires
        })
      )
    )
  }, [queryClient])

  // Fonction pour invalider le cache des suggestions
  const invalidateSuggestions = useCallback(() => {
    queryClient.invalidateQueries({ 
      queryKey: ['company-suggestions'] 
    })
  }, [queryClient])

  // Fonction pour mettre à jour le cache avec une nouvelle entreprise
  const updateCacheWithNewCompany = useCallback((newCompany: { name: string; id: string; industry?: string }) => {
    const queryKey = ['company-suggestions', newCompany.name.toLowerCase()]
    
    queryClient.setQueryData(queryKey, (oldData: CompanySearchResult | undefined) => {
      if (!oldData) return oldData
      
      return {
        ...oldData,
        found: true,
        company: {
          id: newCompany.id,
          name: newCompany.name,
          industry: newCompany.industry,
          address: null
        }
      }
    })
  }, [queryClient])

  return {
    suggestions,
    isLoading,
    isFetching,
    error,
    refetch,
    prefetchPopularCompanies,
    invalidateSuggestions,
    updateCacheWithNewCompany,
    hasData: Boolean(companyData),
    totalSuggestions: suggestions.length
  }
}
