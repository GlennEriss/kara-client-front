/**
 * Hook pour l'éligibilité aux types de caisse charitable (lecture du cache member-charity-summary).
 * Si memberId est null : eligible = false, lastContribution = null (pas d'appel Firestore).
 */

import { useQuery } from '@tanstack/react-query'
import { CharityEligibilityService } from '../services/CharityEligibilityService'
import type { MemberCharityEligibilityResult } from '../entities/charity-eligibility.types'

const service = CharityEligibilityService.getInstance()

export function useMemberCharityEligibility(memberId: string | null) {
  const query = useQuery<MemberCharityEligibilityResult>({
    queryKey: ['member-charity-eligibility', memberId],
    queryFn: () => service.getMemberCharityEligibility(memberId!),
    enabled: Boolean(memberId),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  const eligible = memberId == null ? false : (query.data?.eligible ?? false)
  const lastContribution = memberId == null ? null : (query.data?.lastContribution ?? null)

  return {
    eligible,
    lastContribution,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
