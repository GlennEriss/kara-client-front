/**
 * Hook React Query pour les anniversaires d'un mois spécifique
 * 
 * Gère les anniversaires d'un mois spécifique pour le calendrier.
 * Utilise un cache de 10 minutes pour éviter les re-fetch lors de la navigation.
 * 
 * TODO: Implémenter BirthdaysRepository.getByMonth()
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import type { BirthdayMember } from '../types/birthdays'
import { BirthdaysRepository } from '../repositories/BirthdaysRepository'

export interface UseBirthdaysByMonthOptions {
  month: number // 1-12
  year: number // ex: 2026
  enabled?: boolean
}

export interface UseBirthdaysByMonthReturn {
  data: BirthdayMember[]
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => Promise<unknown>
}

export function useBirthdaysByMonth(
  options: UseBirthdaysByMonthOptions,
): UseBirthdaysByMonthReturn {
  const { month, year, enabled = true } = options

  const repository = BirthdaysRepository.getInstance()

  // Clé de cache unique pour ce mois/année
  const queryKey = ['birthdays', 'calendar', month, year]

  // Requête principale
  const query = useQuery<BirthdayMember[]>({
    queryKey,
    queryFn: () => repository.getByMonth(month, year),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled,
    refetchOnWindowFocus: false,
  })

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
