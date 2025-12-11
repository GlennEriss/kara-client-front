import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useAuth } from './useAuth'
import type { Province, Department, Commune, District, Quarter } from '@/types/types'
import type { ProvinceFormData, DepartmentFormData, CommuneFormData, DistrictFormData, QuarterFormData, DistrictBulkCreateFormData } from '@/schemas/geographie.schema'
import { toast } from 'sonner'

// ================== PROVINCES ==================

export function useProvinces() {
  const service = ServiceFactory.getGeographieService()
  
  return useQuery<Province[]>({
    queryKey: ['provinces'],
    queryFn: () => service.getAllProvinces(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useProvince(id: string) {
  const service = ServiceFactory.getGeographieService()
  
  return useQuery<Province | null>({
    queryKey: ['province', id],
    queryFn: () => service.getProvinceById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useProvinceMutations() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const service = ServiceFactory.getGeographieService()

  const create = useMutation({
    mutationFn: (data: ProvinceFormData) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.createProvince(data, user.uid)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provinces'] })
      toast.success('Province créée avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la création de la province')
    },
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProvinceFormData> }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.updateProvince(id, data, user.uid)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provinces'] })
      toast.success('Province mise à jour avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la mise à jour de la province')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => service.deleteProvince(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provinces'] })
      toast.success('Province supprimée avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la suppression de la province')
    },
  })

  return { create, update, remove }
}

// ================== DÉPARTEMENTS ==================

export function useDepartments(provinceId?: string) {
  const service = ServiceFactory.getGeographieService()
  
  return useQuery<Department[]>({
    queryKey: ['departments', provinceId],
    queryFn: () => provinceId ? service.getDepartmentsByProvinceId(provinceId) : service.getAllDepartments(),
    enabled: !provinceId || !!provinceId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useDepartment(id: string) {
  const service = ServiceFactory.getGeographieService()
  
  return useQuery<Department | null>({
    queryKey: ['department', id],
    queryFn: () => service.getDepartmentById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useDepartmentMutations() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const service = ServiceFactory.getGeographieService()

  const create = useMutation({
    mutationFn: (data: DepartmentFormData) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.createDepartment(data, user.uid)
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['departments'], exact: false })
      qc.refetchQueries({ queryKey: ['departments'], exact: false })
      toast.success('Département créé avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la création du département')
    },
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DepartmentFormData> }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.updateDepartment(id, data, user.uid)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'], exact: false })
      qc.invalidateQueries({ queryKey: ['department'], exact: false })
      qc.refetchQueries({ queryKey: ['departments'], exact: false })
      toast.success('Département mis à jour avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la mise à jour du département')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => service.deleteDepartment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'], exact: false })
      qc.invalidateQueries({ queryKey: ['department'], exact: false })
      qc.refetchQueries({ queryKey: ['departments'], exact: false })
      toast.success('Département supprimé avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la suppression du département')
    },
  })

  return { create, update, remove }
}

// ================== COMMUNES ==================

export function useCommunes(departmentId?: string) {
  const service = ServiceFactory.getGeographieService()
  
  return useQuery<Commune[]>({
    queryKey: ['communes', departmentId],
    queryFn: async () => {
      if (departmentId) return service.getCommunesByDepartmentId(departmentId)
      const all = await service.getAllCommunes()
      return all.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 20)
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useCommune(id: string) {
  const service = ServiceFactory.getGeographieService()
  
  return useQuery<Commune | null>({
    queryKey: ['commune', id],
    queryFn: () => service.getCommuneById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCommuneMutations() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const service = ServiceFactory.getGeographieService()

  const create = useMutation({
    mutationFn: (data: CommuneFormData) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.createCommune(data, user.uid)
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['communes'], exact: false })
      qc.refetchQueries({ queryKey: ['communes'], exact: false })
      toast.success('Commune créée avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la création de la commune')
    },
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CommuneFormData> }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.updateCommune(id, data, user.uid)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communes'], exact: false })
      qc.invalidateQueries({ queryKey: ['commune'], exact: false })
      qc.refetchQueries({ queryKey: ['communes'], exact: false })
      toast.success('Commune mise à jour avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la mise à jour de la commune')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => service.deleteCommune(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communes'], exact: false })
      qc.invalidateQueries({ queryKey: ['commune'], exact: false })
      qc.refetchQueries({ queryKey: ['communes'], exact: false })
      toast.success('Commune supprimée avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la suppression de la commune')
    },
  })

  return { create, update, remove }
}

// ================== ARRONDISSEMENTS ==================

export function useDistricts(communeId?: string) {
  const service = ServiceFactory.getGeographieService()
  
  return useQuery<District[]>({
    queryKey: ['districts', communeId],
    queryFn: async () => {
      if (communeId) return service.getDistrictsByCommuneId(communeId)
      const all = await service.getAllDistricts()
      return all.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 20)
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useDistrict(id: string) {
  const service = ServiceFactory.getGeographieService()
  
  return useQuery<District | null>({
    queryKey: ['district', id],
    queryFn: () => service.getDistrictById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useDistrictMutations() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const service = ServiceFactory.getGeographieService()

  const create = useMutation({
    mutationFn: (data: DistrictFormData) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.createDistrict(data, user.uid)
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['districts'] })
      qc.invalidateQueries({ queryKey: ['districts', variables.communeId] })
      toast.success('Arrondissement créé avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la création de l\'arrondissement')
    },
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DistrictFormData> }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.updateDistrict(id, data, user.uid)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['districts'] })
      toast.success('Arrondissement mis à jour avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la mise à jour de l\'arrondissement')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => service.deleteDistrict(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['districts'] })
      toast.success('Arrondissement supprimé avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la suppression de l\'arrondissement')
    },
  })

  const createBulk = useMutation({
    mutationFn: ({ communeId, count }: { communeId: string; count: number }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.createDistrictsBulk(communeId, count, user.uid)
    },
    onSuccess: (_, variables) => {
      // Invalider et refetch toutes les queries d'arrondissements
      qc.invalidateQueries({ queryKey: ['districts'], exact: false })
      qc.refetchQueries({ queryKey: ['districts'], exact: false })
      toast.success(`${variables.count} arrondissement(s) créé(s) avec succès`)
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la création des arrondissements')
    },
  })

  return { create, update, remove, createBulk }
}

// ================== QUARTIERS ==================

export function useQuarters(districtId?: string) {
  const service = ServiceFactory.getGeographieService()
  
  return useQuery<Quarter[]>({
    queryKey: ['quarters', districtId],
    queryFn: async () => {
      if (districtId) return service.getQuartersByDistrictId(districtId)
      const all = await service.getAllQuarters()
      return all.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 20)
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useQuarter(id: string) {
  const service = ServiceFactory.getGeographieService()
  
  return useQuery<Quarter | null>({
    queryKey: ['quarter', id],
    queryFn: () => service.getQuarterById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useQuarterMutations() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const service = ServiceFactory.getGeographieService()

  const create = useMutation({
    mutationFn: (data: QuarterFormData) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.createQuarter(data, user.uid)
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['quarters'] })
      qc.invalidateQueries({ queryKey: ['quarters', variables.districtId] })
      toast.success('Quartier créé avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la création du quartier')
    },
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<QuarterFormData> }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.updateQuarter(id, data, user.uid)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quarters'] })
      toast.success('Quartier mis à jour avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la mise à jour du quartier')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => service.deleteQuarter(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quarters'] })
      toast.success('Quartier supprimé avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la suppression du quartier')
    },
  })

  return { create, update, remove }
}

