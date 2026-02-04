/**
 * Hook pour l’alerte doublons (au moins un groupe non résolu)
 * Voir documentation/membership-requests/doublons/
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { DuplicateGroupsRepository } from '../repositories/DuplicateGroupsRepository'
import { MEMBERSHIP_REQUEST_CACHE } from '@/constantes/membership-requests'

export function useDuplicateAlert() {
  const repository = DuplicateGroupsRepository.getInstance()

  const { data: hasDuplicates, isLoading } = useQuery<boolean>({
    queryKey: [MEMBERSHIP_REQUEST_CACHE.DUPLICATES_ALERT_QUERY_KEY],
    queryFn: () => repository.hasUnresolvedGroups(),
    staleTime: MEMBERSHIP_REQUEST_CACHE.DUPLICATES_ALERT_STALE_MS,
    refetchOnWindowFocus: true,
  })

  return {
    hasDuplicates: hasDuplicates ?? false,
    isLoading,
  }
}
