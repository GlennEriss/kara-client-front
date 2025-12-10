import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useAuth } from './useAuth'
import type { Province, City, District, Quarter } from '@/types/types'
import type { ProvinceFormData, CityFormData, DistrictFormData, QuarterFormData, DistrictBulkCreateFormData } from '@/schemas/geographie.schema'
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

// ================== VILLES ==================

export function useCities(provinceId?: string) {
  const service = ServiceFactory.getGeographieService()
  
  return useQuery<City[]>({
    queryKey: ['cities', provinceId],
    queryFn: () => provinceId ? service.getCitiesByProvinceId(provinceId) : service.getAllCities(),
    enabled: !provinceId || !!provinceId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useCity(id: string) {
  const service = ServiceFactory.getGeographieService()
  
  return useQuery<City | null>({
    queryKey: ['city', id],
    queryFn: () => service.getCityById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCityMutations() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const service = ServiceFactory.getGeographieService()

  const create = useMutation({
    mutationFn: (data: CityFormData) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.createCity(data, user.uid)
    },
    onSuccess: (_, variables) => {
      // Invalider et refetch toutes les queries de villes
      qc.invalidateQueries({ queryKey: ['cities'], exact: false })
      qc.refetchQueries({ queryKey: ['cities'], exact: false })
      toast.success('Ville créée avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la création de la ville')
    },
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CityFormData> }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.updateCity(id, data, user.uid)
    },
    onSuccess: () => {
      // Invalider et refetch toutes les queries de villes
      qc.invalidateQueries({ queryKey: ['cities'], exact: false })
      qc.invalidateQueries({ queryKey: ['city'], exact: false })
      qc.refetchQueries({ queryKey: ['cities'], exact: false })
      toast.success('Ville mise à jour avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la mise à jour de la ville')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => service.deleteCity(id),
    onSuccess: () => {
      // Invalider et refetch toutes les queries de villes
      qc.invalidateQueries({ queryKey: ['cities'], exact: false })
      qc.invalidateQueries({ queryKey: ['city'], exact: false })
      qc.refetchQueries({ queryKey: ['cities'], exact: false })
      toast.success('Ville supprimée avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la suppression de la ville')
    },
  })

  return { create, update, remove }
}

// ================== ARRONDISSEMENTS ==================

export function useDistricts(cityId?: string) {
  const service = ServiceFactory.getGeographieService()
  
  return useQuery<District[]>({
    queryKey: ['districts', cityId],
    queryFn: () => cityId ? service.getDistrictsByCityId(cityId) : service.getAllDistricts(),
    enabled: !cityId || !!cityId,
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
      qc.invalidateQueries({ queryKey: ['districts', variables.cityId] })
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
    mutationFn: ({ cityId, count }: { cityId: string; count: number }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return service.createDistrictsBulk(cityId, count, user.uid)
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
    queryFn: () => districtId ? service.getQuartersByDistrictId(districtId) : service.getAllQuarters(),
    enabled: !districtId || !!districtId,
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

