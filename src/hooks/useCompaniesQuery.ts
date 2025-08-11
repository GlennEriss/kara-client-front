import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCompaniesPaginated, type CompaniesFilters, type PaginatedCompanies, createCompany, updateCompany, deleteCompany } from '@/db/company.db'

export function useCompaniesPaginated(filters: CompaniesFilters = {}, page = 1, limit = 12) {
  return useQuery<PaginatedCompanies>({
    queryKey: ['companies', filters, page, limit],
    queryFn: () => getCompaniesPaginated(filters, page, limit),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useCompanyMutations() {
  const qc = useQueryClient()

  const create = useMutation({
    mutationFn: ({ name, adminId, address, industry }: { name: string; adminId: string; address?: { province?: string; city?: string; district?: string }; industry?: string }) =>
      createCompany(name, adminId, { address, industry }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  })

  const update = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { name?: string; address?: { province?: string; city?: string; district?: string }; industry?: string } }) =>
      updateCompany(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  })

  return { create, update, remove }
}

