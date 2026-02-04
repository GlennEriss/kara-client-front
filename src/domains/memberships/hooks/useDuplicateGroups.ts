/**
 * Hook pour les groupes de doublons non résolus et la résolution
 * Voir documentation/membership-requests/doublons/
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DuplicateGroupsRepository } from '../repositories/DuplicateGroupsRepository'
import { MEMBERSHIP_REQUEST_CACHE } from '@/constantes/membership-requests'
import type { DuplicateGroup } from '../entities/DuplicateGroup'

export function useDuplicateGroups() {
  const repository = DuplicateGroupsRepository.getInstance()
  const queryClient = useQueryClient()

  const { data: groups = [], isLoading, isError, error } = useQuery<DuplicateGroup[]>({
    queryKey: [MEMBERSHIP_REQUEST_CACHE.DUPLICATES_GROUPS_QUERY_KEY],
    queryFn: () => repository.getUnresolvedGroups(),
    staleTime: MEMBERSHIP_REQUEST_CACHE.DUPLICATES_GROUPS_STALE_MS,
    refetchOnWindowFocus: true,
  })

  const resolveGroupMutation = useMutation({
    mutationFn: ({ groupId, adminId }: { groupId: string; adminId: string }) =>
      repository.resolveGroup(groupId, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEMBERSHIP_REQUEST_CACHE.DUPLICATES_GROUPS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [MEMBERSHIP_REQUEST_CACHE.DUPLICATES_ALERT_QUERY_KEY] })
    },
  })

  const resolveGroup = (groupId: string, adminId: string) =>
    resolveGroupMutation.mutateAsync({ groupId, adminId })

  return {
    groups,
    isLoading,
    isError,
    error,
    resolveGroup,
    isResolving: resolveGroupMutation.isPending,
  }
}
