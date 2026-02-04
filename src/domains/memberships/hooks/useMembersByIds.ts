import { useQuery } from '@tanstack/react-query'
import { MembersRepositoryV2 } from '@/domains/memberships/repositories/MembersRepositoryV2'

/**
 * Récupère plusieurs membres par leurs ids (pour affichage listes/contrats).
 * Utilise le repository du domaine memberships.
 */
export function useMembersByIds(memberIds: string[]) {
  const repository = MembersRepositoryV2.getInstance()
  return useQuery({
    queryKey: ['members', 'byIds', memberIds],
    queryFn: () => repository.getByIds(memberIds),
    enabled: memberIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
