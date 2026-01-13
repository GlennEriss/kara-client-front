import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { ProfessionFilters, PaginatedProfessions } from '../entities/profession.types'
import { Profession } from '../entities/profession.types'

/**
 * Hook pour récupérer les professions avec pagination
 */
export function useProfessionsPaginated(filters: ProfessionFilters = {}, page = 1, limit = 12) {
  const professionService = ServiceFactory.getProfessionService()
  
  return useQuery<PaginatedProfessions>({
    queryKey: ['professions', filters, page, limit],
    queryFn: () => professionService.getPaginated(filters, page, limit),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

/**
 * Hook pour les mutations de professions (create, update, delete)
 */
export function useProfessionMutations() {
  const queryClient = useQueryClient()
  const professionService = ServiceFactory.getProfessionService()

  const create = useMutation({
    mutationFn: ({ 
      name, 
      adminId, 
      category,
      description
    }: { 
      name: string
      adminId: string
      category?: string
      description?: string
    }) => professionService.create({
      name,
      normalizedName: '', // Sera calculé dans le repository
      category,
      description,
      createdBy: adminId,
    }, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professions'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['profession-search'] })
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
        category?: string
        description?: string
      }
    }) => professionService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professions'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['profession-search'] })
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => professionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professions'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['profession-search'] })
    },
  })

  return { create, update, remove }
}

/**
 * Hook pour rechercher une profession par nom
 */
export function useProfessionSearch(professionName: string) {
  const professionService = ServiceFactory.getProfessionService()
  
  return useQuery({
    queryKey: ['profession-search', professionName],
    queryFn: () => professionService.findByName(professionName),
    enabled: !!professionName && professionName.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook pour récupérer toutes les professions
 */
export function useProfessions(filters?: ProfessionFilters) {
  const professionService = ServiceFactory.getProfessionService()
  
  return useQuery<Profession[]>({
    queryKey: ['professions', 'all', filters],
    queryFn: () => professionService.getAll(filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

/**
 * Hook de compatibilité avec l'ancien useJobs
 */
export function useJobs(filters: ProfessionFilters = {}, page = 1, limit = 12) {
  return useProfessionsPaginated(filters, page, limit)
}

/**
 * Hook de compatibilité avec l'ancien useJobMutations
 */
export function useJobMutations() {
  return useProfessionMutations()
}
