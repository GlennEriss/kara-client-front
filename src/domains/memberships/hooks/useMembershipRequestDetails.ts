/**
 * Hook agrégateur pour la vue détails d'une demande d'adhésion
 * - Récupère la demande (repository V2)
 * - Récupère l'admin traiteur (processedBy)
 * - Récupère l'intermédiaire (useIntermediary) si code présent
 * - Résout l'URL du PDF d'adhésion (directe ou fallback Firestore documents)
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { MembershipRepositoryV2 } from '../repositories/MembershipRepositoryV2'
import type { MembershipRequest } from '../entities'
import { resolveAdhesionPdfUrl } from '../utils/details'
import { getAdminById } from '@/db/admin.db'
import { useIntermediary } from '@/hooks/useIntermediary'
import { MEMBERSHIP_REQUEST_CACHE } from '@/constantes/membership-requests'

export interface MembershipRequestDetailsResult {
  request: MembershipRequest | null
  admin: any | null
  intermediary: any | null
  adhesionPdfUrlResolved: string | null
  isLoading: boolean
  isError: boolean
  error: unknown
}

export function useMembershipRequestDetails(requestId: string) {
  const repository = MembershipRepositoryV2.getInstance()

  const requestQuery = useQuery<MembershipRequest | null>({
    queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY, 'details', requestId],
    queryFn: () => repository.getById(requestId),
    staleTime: MEMBERSHIP_REQUEST_CACHE.STALE_TIME_MS,
    gcTime: MEMBERSHIP_REQUEST_CACHE.GC_TIME_MS,
    enabled: !!requestId,
    refetchOnWindowFocus: false,
  })

  const adminQuery = useQuery<any | null>({
    queryKey: ['membershipRequest-admin', requestId, requestQuery.data?.processedBy],
    queryFn: () => {
      if (!requestQuery.data?.processedBy) return Promise.resolve(null)
      return getAdminById(requestQuery.data.processedBy)
    },
    enabled: !!requestQuery.data?.processedBy,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const intermediaryQuery = useIntermediary(requestQuery.data?.identity?.intermediaryCode)

  const adhesionPdfQuery = useQuery<string | null>({
    queryKey: ['membershipRequest-adhesionPdf', requestId, requestQuery.data?.adhesionPdfURL],
    queryFn: () => {
      if (!requestQuery.data) return Promise.resolve(null)
      return resolveAdhesionPdfUrl({
        id: requestQuery.data.id,
        matricule: requestQuery.data.matricule,
        adhesionPdfURL: requestQuery.data.adhesionPdfURL,
        status: requestQuery.data.status,
      })
    },
    enabled: !!requestQuery.data && requestQuery.data.status === 'approved',
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const isLoading = requestQuery.isLoading || adminQuery.isLoading || intermediaryQuery.isLoading || adhesionPdfQuery.isLoading
  const isError = requestQuery.isError || adminQuery.isError || adhesionPdfQuery.isError
  const error = requestQuery.error || adminQuery.error || adhesionPdfQuery.error

  return {
    request: requestQuery.data ?? null,
    admin: adminQuery.data ?? null,
    intermediary: intermediaryQuery.data ?? null,
    adhesionPdfUrlResolved: adhesionPdfQuery.data ?? null,
    isLoading,
    isError,
    error,
  } as MembershipRequestDetailsResult
}
