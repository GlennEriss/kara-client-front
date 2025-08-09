import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAdmins,
  getAdminById,
  searchAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  PaginatedAdmins,
  AdminFilters,
  AdminUser,
  CreateAdminInput,
} from '@/db/admin.db'

export function useAdmins(
  filters: AdminFilters = {},
  page: number = 1,
  itemsPerPage: number = 10
) {
  return useQuery<PaginatedAdmins>({
    queryKey: ['admins', filters, page, itemsPerPage],
    queryFn: () => getAdmins(filters, page, itemsPerPage),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useAdmin(adminId: string) {
  return useQuery<AdminUser | null>({
    queryKey: ['admins', adminId],
    queryFn: () => getAdminById(adminId),
    enabled: !!adminId,
    staleTime: 3 * 60 * 1000,
  })
}

export function useSearchAdmins(searchTerm: string, enabled: boolean = true) {
  return useQuery<AdminUser[]>({
    queryKey: ['admins', 'search', searchTerm],
    queryFn: () => searchAdmins(searchTerm),
    enabled: enabled && searchTerm.trim().length >= 2,
    staleTime: 2 * 60 * 1000,
  })
}

export function useAdminMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (input: CreateAdminInput) => createAdmin(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<AdminUser> }) =>
      updateAdmin(id, updates),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admins'] })
      if (variables?.id) queryClient.invalidateQueries({ queryKey: ['admins', variables.id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] })
    },
  })

  return { createMutation, updateMutation, deleteMutation }
}

export type UseAdminsResult = ReturnType<typeof useAdmins>
export type UseAdminResult = ReturnType<typeof useAdmin>
export type UseSearchAdminsResult = ReturnType<typeof useSearchAdmins>
