/**
 * Hook React Query pour les actions sur les demandes d'adhésion V2
 * 
 * Gère les mutations : approve, reject, corrections, payment
 */

'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MembershipServiceV2 } from '../services/MembershipServiceV2'
import { MEMBERSHIP_REQUEST_CACHE } from '@/constantes/membership-requests'
import type {
  ApproveMembershipRequestParams,
  RejectMembershipRequestParams,
  RequestCorrectionsParams,
  ProcessPaymentParams,
} from '../services/interfaces/IMembershipService'

export function useMembershipActionsV2() {
  const queryClient = useQueryClient()
  const service = MembershipServiceV2.getInstance()

  const approveMutation = useMutation({
    mutationFn: (params: ApproveMembershipRequestParams) =>
      service.approveMembershipRequest(params),
    onSuccess: () => {
      // Invalider les queries pour refetch
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY] 
      })
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.STATS_QUERY_KEY] 
      })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (params: RejectMembershipRequestParams) =>
      service.rejectMembershipRequest(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY] 
      })
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.STATS_QUERY_KEY] 
      })
    },
  })

  const requestCorrectionsMutation = useMutation({
    mutationFn: (params: RequestCorrectionsParams) =>
      service.requestCorrections(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY] 
      })
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.STATS_QUERY_KEY] 
      })
    },
  })

  const processPaymentMutation = useMutation({
    mutationFn: (params: ProcessPaymentParams) =>
      service.processPayment(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY] 
      })
      queryClient.invalidateQueries({ 
        queryKey: [MEMBERSHIP_REQUEST_CACHE.STATS_QUERY_KEY] 
      })
    },
  })

  return {
    approveMutation,
    rejectMutation,
    requestCorrectionsMutation,
    processPaymentMutation,
  }
}
