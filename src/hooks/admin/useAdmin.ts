import { useQuery } from '@tanstack/react-query'
import { getAdminById } from '@/db/admin.db'

export function useAdmin(adminId?: string) {
  return useQuery({
    queryKey: ['admin', adminId],
    queryFn: () => getAdminById(adminId!),
    enabled: !!adminId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}
