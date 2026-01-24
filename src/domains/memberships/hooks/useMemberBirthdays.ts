/**
 * Hook React Query pour la liste paginée des anniversaires
 * 
 * Gère la liste paginée des anniversaires triée par date la plus proche.
 * Supporte les filtres par mois et la recherche locale.
 * 
 * TODO: Implémenter BirthdaysRepository.getPaginated()
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import type {
  BirthdayMember,
  PaginatedBirthdays,
} from '../types/birthdays'
import { BirthdaysRepository } from '../repositories/BirthdaysRepository'

export interface UseMemberBirthdaysOptions {
  page?: number
  itemsPerPage?: number // default: 20
  months?: number[] // filtres par mois (ex: [1, 2] pour Jan, Fév)
  searchQuery?: string // recherche locale (après fetch)
  enabled?: boolean
}

export interface UseMemberBirthdaysReturn {
  data: BirthdayMember[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  isLoading: boolean
  isError: boolean
  error: unknown
  goToNextPage: () => void
  goToPrevPage: () => void
  refetch: () => Promise<unknown>
}

export function useMemberBirthdays(
  options: UseMemberBirthdaysOptions = {},
): UseMemberBirthdaysReturn {
  const {
    page = 1,
    itemsPerPage = 20,
    months = [],
    searchQuery,
    enabled = true,
  } = options

  const repository = BirthdaysRepository.getInstance()

  // Clé de cache unique pour cette combinaison de paramètres
  const queryKey = ['birthdays', 'list', { page, months, itemsPerPage }]

  // Requête principale
  const query = useQuery<PaginatedBirthdays>({
    queryKey,
    queryFn: () =>
      repository.getPaginated({
        page,
        limit: itemsPerPage,
        months,
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled,
    refetchOnWindowFocus: false,
  })

  // Filtrage local par recherche si fourni
  const filteredData = query.data
    ? {
        ...query.data,
        data: searchQuery
          ? query.data.data.filter((b) => {
              const query = searchQuery.toLowerCase()
              return (
                b.firstName.toLowerCase().includes(query) ||
                b.lastName.toLowerCase().includes(query) ||
                b.matricule.toLowerCase().includes(query)
              )
            })
          : query.data.data,
      }
    : undefined

  // Navigation pagination (pour compatibilité avec l'ancienne interface)
  const goToNextPage = () => {
    // TODO: Implémenter la navigation vers la page suivante
    // Cela nécessitera de gérer l'état de la page dans le composant parent
    console.warn('goToNextPage() not yet implemented - use page prop instead')
  }

  const goToPrevPage = () => {
    // TODO: Implémenter la navigation vers la page précédente
    console.warn('goToPrevPage() not yet implemented - use page prop instead')
  }

  return {
    data: filteredData?.data ?? [],
    pagination: filteredData?.pagination ?? {
      currentPage: page,
      totalPages: 0,
      totalItems: 0,
      hasNextPage: false,
      hasPrevPage: false,
    },
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    goToNextPage,
    goToPrevPage,
    refetch: query.refetch,
  }
}
