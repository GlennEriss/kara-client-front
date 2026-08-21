'use client'

import { useQuery } from '@tanstack/react-query'
import { getMemberFormSummary } from '../services/MemberFormService'

export function useMemberForm(memberId: string) {
  return useQuery({
    queryKey: ['member-form', memberId],
    queryFn: () => getMemberFormSummary(memberId),
    enabled: Boolean(memberId),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  })
}
