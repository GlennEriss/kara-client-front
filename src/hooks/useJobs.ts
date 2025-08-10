import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getJobsPaginated, type JobsFilters, type PaginatedJobs, createProfession, updateProfession, deleteProfession } from '@/db/profession.db'

export function useJobs(filters: JobsFilters = {}, page = 1, limit = 12) {
  return useQuery<PaginatedJobs>({
    queryKey: ['jobs', filters, page, limit],
    queryFn: () => getJobsPaginated(filters, page, limit),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useJobMutations() {
  const qc = useQueryClient()

  const create = useMutation({
    mutationFn: ({ name, adminId, description }: { name: string; adminId: string; description?: string }) =>
      createProfession(name, adminId, { description }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  const update = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { name?: string; description?: string } }) =>
      updateProfession(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteProfession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  return { create, update, remove }
}

