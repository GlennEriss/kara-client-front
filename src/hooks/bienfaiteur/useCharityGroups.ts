'use client'

import { useQuery } from '@tanstack/react-query'
import { listGroups } from '@/db/group.db'

/**
 * Hook pour récupérer tous les groupes
 * Réutilise la fonction existante listGroups
 */
export function useCharityGroups() {
  return useQuery({
    queryKey: ['groups', 'list'],
    queryFn: () => listGroups(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

