import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useAuditLogger } from '@/hooks/useAuditLog'
import { CompanyFilters, PaginatedCompanies } from '../repositories/ICompanyRepository'
import { Company } from '../entities/company.types'

const REF_MODULE = { module: 'references', moduleLabel: 'Métiers / Entreprises' } as const

/**
 * Hook pour récupérer les entreprises avec pagination
 */
export function useCompaniesPaginated(filters: CompanyFilters = {}, page = 1, limit = 12) {
  const companyService = ServiceFactory.getCompanyService()
  
  return useQuery<PaginatedCompanies>({
    queryKey: ['companies', filters, page, limit],
    queryFn: () => companyService.getPaginated(filters, page, limit),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

/**
 * Hook pour les mutations d'entreprises (create, update, delete)
 */
export function useCompanyMutations() {
  const queryClient = useQueryClient()
  const companyService = ServiceFactory.getCompanyService()
  const { log } = useAuditLogger()

  const create = useMutation({
    mutationFn: ({ 
      name, 
      adminId, 
      address, 
      industry,
      employeeCount
    }: { 
      name: string
      adminId: string
      address?: { 
        province?: string
        city?: string
        district?: string
        arrondissement?: string
        additionalInfo?: string
      }
      industry?: string
      employeeCount?: number
    }) => companyService.create({
      name,
      normalizedName: '', // Sera calculé dans le repository
      address,
      industry,
      employeeCount,
      createdBy: adminId,
    }, adminId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['company-search'] })
      queryClient.invalidateQueries({ queryKey: ['company-suggestions'] })
      log({ action: 'create', ...REF_MODULE, targetType: 'entreprise', description: `Création de l'entreprise « ${variables.name} »` })
    },
  })

  const update = useMutation({
    mutationFn: ({ 
      id, 
      updates 
    }: { 
      id: string
      updates: { 
        name?: string
        address?: { 
          province?: string
          city?: string
          district?: string
          arrondissement?: string
          additionalInfo?: string
        }
        industry?: string
        employeeCount?: number
      }
    }) => companyService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['company-search'] })
      queryClient.invalidateQueries({ queryKey: ['company-suggestions'] })
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => companyService.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['company-search'] })
      queryClient.invalidateQueries({ queryKey: ['company-suggestions'] })
      log({ action: 'delete', ...REF_MODULE, targetType: 'entreprise', targetId: id, description: 'Suppression d\'une entreprise' })
    },
  })

  return { create, update, remove }
}

/**
 * Hook pour rechercher une entreprise par nom
 */
export function useCompanySearch(companyName: string) {
  const companyService = ServiceFactory.getCompanyService()
  
  return useQuery({
    queryKey: ['company-search', companyName],
    queryFn: () => companyService.findByName(companyName),
    enabled: !!companyName && companyName.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook pour récupérer toutes les entreprises
 */
export function useCompanies(filters?: CompanyFilters) {
  const companyService = ServiceFactory.getCompanyService()
  
  return useQuery<Company[]>({
    queryKey: ['companies', 'all', filters],
    queryFn: () => companyService.getAll(filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
