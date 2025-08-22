import { useQuery } from '@tanstack/react-query'
import { listGroups } from '@/db/group.db'

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => listGroups(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
} 