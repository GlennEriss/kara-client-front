import { useQuery } from '@tanstack/react-query'
import { MembersRepositoryV2 } from '@/domains/memberships/repositories/MembersRepositoryV2'

/**
 * Récupère un membre par son id (document users / uid).
 * Utilise le repository du domaine memberships.
 */
export function useMemberById(memberId: string | undefined) {
  const repository = MembersRepositoryV2.getInstance()
  return useQuery({
    queryKey: ['member', 'byId', memberId],
    queryFn: () => repository.getById(memberId!),
    enabled: Boolean(memberId?.trim()),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
