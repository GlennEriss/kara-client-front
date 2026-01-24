/**
 * Hook pour récupérer une demande d'adhésion par son ID (Version simple pour l'édition)
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { MembershipRepositoryV2 } from '../repositories/MembershipRepositoryV2'
import type { MembershipRequest } from '../entities'
import { MEMBERSHIP_REQUEST_CACHE } from '@/constantes/membership-requests'

export function useMembershipRequest(requestId: string) {
    const repository = MembershipRepositoryV2.getInstance()

    return useQuery<MembershipRequest | null>({
        queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY, 'single', requestId],
        queryFn: () => repository.getById(requestId),
        staleTime: MEMBERSHIP_REQUEST_CACHE.STALE_TIME_MS,
        gcTime: MEMBERSHIP_REQUEST_CACHE.GC_TIME_MS,
        enabled: !!requestId,
        refetchOnWindowFocus: false,
    })
}
