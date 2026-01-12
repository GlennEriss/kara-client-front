import { useQuery, useMutation, useQueryClient, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import type { Province, Department, Commune, District, Quarter } from '../entities/geography.types'
import type { ProvinceFormData, DepartmentFormData, CommuneFormData, DistrictFormData, QuarterFormData } from '../schemas/geographie.schema'
import { ProvinceRepositoryV2 } from '../repositories/ProvinceRepositoryV2'
import { DepartmentRepositoryV2 } from '../repositories/DepartmentRepositoryV2'
import { CommuneRepositoryV2 } from '../repositories/CommuneRepositoryV2'
import { DistrictRepositoryV2 } from '../repositories/DistrictRepositoryV2'
import { QuarterRepositoryV2 } from '../repositories/QuarterRepositoryV2'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { toast } from 'sonner'
import { useMemo, useState, useCallback, useEffect, useRef } from 'react'

// ================== HOOK DEBOUNCE ==================

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// ================== CONSTANTES ==================

const DEFAULT_PAGE_SIZE = 20
const STALE_TIME = 5 * 60 * 1000 // 5 minutes
const GC_TIME = 10 * 60 * 1000 // 10 minutes
const SEARCH_DEBOUNCE_MS = 300

// ================== HELPERS ==================

/**
 * Vérifie si une erreur est une erreur d'annulation de requête (à ignorer)
 */
function isAbortError(error: any): boolean {
  if (!error) return false
  const message = error?.message || error?.toString() || ''
  return (
    message.includes('aborted') ||
    message.includes('canceled') ||
    message.includes('The user aborted') ||
    error?.name === 'AbortError' ||
    error?.code === 'ECONNABORTED'
  )
}

/**
 * Filtre les erreurs pour ignorer les annulations
 */
function filterError(error: Error | null): Error | null {
  if (!error) return null
  if (isAbortError(error)) return null // Ignorer les erreurs d'annulation
  return error
}

// ================== SINGLETON REPOSITORIES ==================

const provinceRepo = new ProvinceRepositoryV2()
const departmentRepo = new DepartmentRepositoryV2()
const communeRepo = new CommuneRepositoryV2()
const districtRepo = new DistrictRepositoryV2()
const quarterRepo = new QuarterRepositoryV2()

// ================== TYPES ==================

interface UseGeographyListOptions {
  /** Terme de recherche (debounced automatiquement) */
  search?: string
  /** ID du parent pour filtrer */
  parentId?: string
  /** Taille de page */
  pageSize?: number
  /** Activer la pagination infinie (scroll) */
  infiniteScroll?: boolean
}

interface UseGeographyListResult<T> {
  /** Données de la page courante */
  data: T[]
  /** Chargement initial */
  isLoading: boolean
  /** Chargement de la page suivante */
  isFetchingNextPage: boolean
  /** Erreur */
  error: Error | null
  /** Y a-t-il une page suivante */
  hasNextPage: boolean
  /** Charger la page suivante */
  fetchNextPage: () => void
  /** Nombre total (approximatif) */
  totalCount?: number
  /** Rafraîchir les données */
  refetch: () => void
}

// ================== HOOKS PROVINCES ==================

/**
 * Hook pour récupérer les provinces paginées avec recherche
 */
export function useProvincesV2(options: UseGeographyListOptions = {}): UseGeographyListResult<Province> {
  const { search = '', pageSize = DEFAULT_PAGE_SIZE } = options
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS)

  const queryResult = useInfiniteQuery({
    queryKey: ['provinces-v2', { search: debouncedSearch, pageSize }],
    queryFn: async ({ pageParam }) => {
      return provinceRepo.getPaginated({
        search: debouncedSearch || undefined,
        pageSize,
        cursor: pageParam || undefined,
      })
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      // Ne pas réessayer si c'est une erreur d'annulation
      if (isAbortError(error)) return false
      return failureCount < 2
    },
    throwOnError: (error) => {
      // Ne pas propager les erreurs d'annulation
      return !isAbortError(error)
    },
  })

  // Count séparé avec cache
  const { data: totalCount } = useQuery({
    queryKey: ['provinces-count'],
    queryFn: () => provinceRepo.getCount(),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: (failureCount, error) => {
      if (isAbortError(error)) return false
      return failureCount < 2
    },
    throwOnError: (error) => !isAbortError(error),
  })

  // Flatten les pages en une seule liste
  const data = useMemo(() => {
    if (!queryResult.data) return []
    return queryResult.data.pages.flatMap((page) => page.data)
  }, [queryResult.data])

  return {
    data,
    isLoading: queryResult.isLoading,
    isFetchingNextPage: queryResult.isFetchingNextPage,
    error: filterError(queryResult.error),
    hasNextPage: queryResult.hasNextPage,
    fetchNextPage: queryResult.fetchNextPage,
    totalCount,
    refetch: queryResult.refetch,
  }
}

/**
 * Mutations pour les provinces V2
 */
export function useProvinceMutationsV2() {
  const qc = useQueryClient()
  const { user } = useAuth()

  const invalidateQueries = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['provinces-v2'] })
    qc.invalidateQueries({ queryKey: ['provinces-count'] })
    // Invalider aussi les stats
    qc.invalidateQueries({ queryKey: ['geography-stats'] })
  }, [qc])

  const create = useMutation({
    mutationFn: async (data: ProvinceFormData) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return provinceRepo.create({
        ...data,
        code: data.code.toUpperCase(),
        createdBy: user.uid,
      })
    },
    onSuccess: () => {
      invalidateQueries()
      toast.success('Province créée avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la création')
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProvinceFormData> }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return provinceRepo.update(id, {
        ...data,
        code: data.code?.toUpperCase(),
        updatedBy: user.uid,
      } as any)
    },
    onSuccess: () => {
      invalidateQueries()
      toast.success('Province mise à jour avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la mise à jour')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => provinceRepo.delete(id),
    onSuccess: () => {
      invalidateQueries()
      toast.success('Province supprimée avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la suppression')
    },
  })

  return { create, update, remove }
}

// ================== HOOKS DÉPARTEMENTS ==================

export function useDepartmentsV2(options: UseGeographyListOptions = {}): UseGeographyListResult<Department> {
  const { search = '', parentId, pageSize = DEFAULT_PAGE_SIZE } = options
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS)

  const queryResult = useInfiniteQuery({
    queryKey: ['departments-v2', { search: debouncedSearch, parentId, pageSize }],
    queryFn: async ({ pageParam }) => {
      return departmentRepo.getPaginated({
        search: debouncedSearch || undefined,
        parentId,
        pageSize,
        cursor: pageParam || undefined,
      })
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      if (isAbortError(error)) return false
      return failureCount < 2
    },
    throwOnError: (error) => !isAbortError(error),
  })

  const { data: totalCount } = useQuery({
    queryKey: ['departments-count', parentId],
    queryFn: () => departmentRepo.getCount(parentId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: (failureCount, error) => {
      if (isAbortError(error)) return false
      return failureCount < 2
    },
    throwOnError: (error) => !isAbortError(error),
  })

  const data = useMemo(() => {
    if (!queryResult.data) return []
    return queryResult.data.pages.flatMap((page) => page.data)
  }, [queryResult.data])

  return {
    data,
    isLoading: queryResult.isLoading,
    isFetchingNextPage: queryResult.isFetchingNextPage,
    error: filterError(queryResult.error),
    hasNextPage: queryResult.hasNextPage,
    fetchNextPage: queryResult.fetchNextPage,
    totalCount,
    refetch: queryResult.refetch,
  }
}

export function useDepartmentMutationsV2() {
  const qc = useQueryClient()
  const { user } = useAuth()

  const invalidateQueries = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['departments-v2'] })
    qc.invalidateQueries({ queryKey: ['departments-count'] })
    qc.invalidateQueries({ queryKey: ['geography-stats'] })
  }, [qc])

  const create = useMutation({
    mutationFn: async (data: DepartmentFormData) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return departmentRepo.create({
        ...data,
        code: data.code ? data.code.toUpperCase() : undefined,
        createdBy: user.uid,
      })
    },
    onSuccess: () => {
      invalidateQueries()
      toast.success('Département créé avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la création')
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DepartmentFormData> }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return departmentRepo.update(id, {
        ...data,
        code: data.code ? data.code.toUpperCase() : undefined,
        updatedBy: user.uid,
      } as any)
    },
    onSuccess: () => {
      invalidateQueries()
      toast.success('Département mis à jour avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la mise à jour')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => departmentRepo.delete(id),
    onSuccess: () => {
      invalidateQueries()
      toast.success('Département supprimé avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la suppression')
    },
  })

  return { create, update, remove }
}

// ================== HOOKS COMMUNES ==================

export function useCommunesV2(options: UseGeographyListOptions = {}): UseGeographyListResult<Commune> {
  const { search = '', parentId, pageSize = DEFAULT_PAGE_SIZE } = options
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS)

  const queryResult = useInfiniteQuery({
    queryKey: ['communes-v2', { search: debouncedSearch, parentId, pageSize }],
    queryFn: async ({ pageParam }) => {
      return communeRepo.getPaginated({
        search: debouncedSearch || undefined,
        parentId,
        pageSize,
        cursor: pageParam || undefined,
      })
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      if (isAbortError(error)) return false
      return failureCount < 2
    },
    throwOnError: (error) => !isAbortError(error),
  })

  const { data: totalCount } = useQuery({
    queryKey: ['communes-count', parentId],
    queryFn: () => communeRepo.getCount(parentId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: (failureCount, error) => {
      if (isAbortError(error)) return false
      return failureCount < 2
    },
    throwOnError: (error) => !isAbortError(error),
  })

  const data = useMemo(() => {
    if (!queryResult.data) return []
    return queryResult.data.pages.flatMap((page) => page.data)
  }, [queryResult.data])

  return {
    data,
    isLoading: queryResult.isLoading,
    isFetchingNextPage: queryResult.isFetchingNextPage,
    error: filterError(queryResult.error),
    hasNextPage: queryResult.hasNextPage,
    fetchNextPage: queryResult.fetchNextPage,
    totalCount,
    refetch: queryResult.refetch,
  }
}

export function useCommuneMutationsV2() {
  const qc = useQueryClient()
  const { user } = useAuth()

  const invalidateQueries = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['communes-v2'] })
    qc.invalidateQueries({ queryKey: ['communes-count'] })
    qc.invalidateQueries({ queryKey: ['geography-stats'] })
  }, [qc])

  const create = useMutation({
    mutationFn: async (data: CommuneFormData) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return communeRepo.create({
        ...data,
        postalCode: data.postalCode ?? undefined,
        alias: data.alias ?? undefined,
        createdBy: user.uid,
      })
    },
    onSuccess: () => {
      invalidateQueries()
      toast.success('Commune créée avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la création')
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CommuneFormData> }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return communeRepo.update(id, {
        ...data,
        postalCode: data.postalCode ?? undefined,
        alias: data.alias ?? undefined,
        updatedBy: user.uid,
      } as any)
    },
    onSuccess: () => {
      invalidateQueries()
      toast.success('Commune mise à jour avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la mise à jour')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => communeRepo.delete(id),
    onSuccess: () => {
      invalidateQueries()
      toast.success('Commune supprimée avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la suppression')
    },
  })

  return { create, update, remove }
}

// ================== HOOKS ARRONDISSEMENTS ==================

export function useDistrictsV2(options: UseGeographyListOptions = {}): UseGeographyListResult<District> {
  const { search = '', parentId, pageSize = DEFAULT_PAGE_SIZE } = options
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS)

  const queryResult = useInfiniteQuery({
    queryKey: ['districts-v2', { search: debouncedSearch, parentId, pageSize }],
    queryFn: async ({ pageParam }) => {
      return districtRepo.getPaginated({
        search: debouncedSearch || undefined,
        parentId,
        pageSize,
        cursor: pageParam || undefined,
      })
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      if (isAbortError(error)) return false
      return failureCount < 2
    },
    throwOnError: (error) => !isAbortError(error),
  })

  const { data: totalCount } = useQuery({
    queryKey: ['districts-count', parentId],
    queryFn: () => districtRepo.getCount(parentId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: (failureCount, error) => {
      if (isAbortError(error)) return false
      return failureCount < 2
    },
    throwOnError: (error) => !isAbortError(error),
  })

  const data = useMemo(() => {
    if (!queryResult.data) return []
    return queryResult.data.pages.flatMap((page) => page.data)
  }, [queryResult.data])

  return {
    data,
    isLoading: queryResult.isLoading,
    isFetchingNextPage: queryResult.isFetchingNextPage,
    error: filterError(queryResult.error),
    hasNextPage: queryResult.hasNextPage,
    fetchNextPage: queryResult.fetchNextPage,
    totalCount,
    refetch: queryResult.refetch,
  }
}

export function useDistrictMutationsV2() {
  const qc = useQueryClient()
  const { user } = useAuth()

  const invalidateQueries = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['districts-v2'] })
    qc.invalidateQueries({ queryKey: ['districts-count'] })
    qc.invalidateQueries({ queryKey: ['geography-stats'] })
  }, [qc])

  const create = useMutation({
    mutationFn: async (data: DistrictFormData) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return districtRepo.create({
        ...data,
        createdBy: user.uid,
      })
    },
    onSuccess: () => {
      invalidateQueries()
      toast.success('Arrondissement créé avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la création')
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DistrictFormData> }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return districtRepo.update(id, {
        ...data,
        updatedBy: user.uid,
      } as any)
    },
    onSuccess: () => {
      invalidateQueries()
      toast.success('Arrondissement mis à jour avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la mise à jour')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => districtRepo.delete(id),
    onSuccess: () => {
      invalidateQueries()
      toast.success('Arrondissement supprimé avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la suppression')
    },
  })

  const createBulk = useMutation({
    mutationFn: async ({ communeId, count }: { communeId: string; count: number }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      const service = ServiceFactory.getGeographieService()
      return service.createDistrictsBulk(communeId, count, user.uid)
    },
    onSuccess: (_, variables) => {
      invalidateQueries()
      toast.success(`${variables.count} arrondissement(s) créé(s) avec succès`)
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la création des arrondissements')
    },
  })

  return { create, update, remove, createBulk }
}

// ================== HOOKS QUARTIERS ==================

export function useQuartersV2(options: UseGeographyListOptions = {}): UseGeographyListResult<Quarter> {
  const { search = '', parentId, pageSize = DEFAULT_PAGE_SIZE } = options
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS)

  const queryResult = useInfiniteQuery({
    queryKey: ['quarters-v2', { search: debouncedSearch, parentId, pageSize }],
    queryFn: async ({ pageParam }) => {
      return quarterRepo.getPaginated({
        search: debouncedSearch || undefined,
        parentId,
        pageSize,
        cursor: pageParam || undefined,
      })
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      if (isAbortError(error)) return false
      return failureCount < 2
    },
    throwOnError: (error) => !isAbortError(error),
  })

  const { data: totalCount } = useQuery({
    queryKey: ['quarters-count', parentId],
    queryFn: () => quarterRepo.getCount(parentId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: (failureCount, error) => {
      if (isAbortError(error)) return false
      return failureCount < 2
    },
    throwOnError: (error) => !isAbortError(error),
  })

  const data = useMemo(() => {
    if (!queryResult.data) return []
    return queryResult.data.pages.flatMap((page) => page.data)
  }, [queryResult.data])

  return {
    data,
    isLoading: queryResult.isLoading,
    isFetchingNextPage: queryResult.isFetchingNextPage,
    error: filterError(queryResult.error),
    hasNextPage: queryResult.hasNextPage,
    fetchNextPage: queryResult.fetchNextPage,
    totalCount,
    refetch: queryResult.refetch,
  }
}

export function useQuarterMutationsV2() {
  const qc = useQueryClient()
  const { user } = useAuth()

  const invalidateQueries = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['quarters-v2'] })
    qc.invalidateQueries({ queryKey: ['quarters-count'] })
    qc.invalidateQueries({ queryKey: ['geography-stats'] })
  }, [qc])

  const create = useMutation({
    mutationFn: async (data: QuarterFormData) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return quarterRepo.create({
        ...data,
        createdBy: user.uid,
      })
    },
    onSuccess: () => {
      invalidateQueries()
      toast.success('Quartier créé avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la création')
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<QuarterFormData> }) => {
      if (!user?.uid) throw new Error('Utilisateur non authentifié')
      return quarterRepo.update(id, {
        ...data,
        updatedBy: user.uid,
      } as any)
    },
    onSuccess: () => {
      invalidateQueries()
      toast.success('Quartier mis à jour avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la mise à jour')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => quarterRepo.delete(id),
    onSuccess: () => {
      invalidateQueries()
      toast.success('Quartier supprimé avec succès')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la suppression')
    },
  })

  return { create, update, remove }
}

// ================== STATISTIQUES V2 ==================

export function useGeographyStatsV2() {
  const { data: provincesCount = 0 } = useQuery({
    queryKey: ['provinces-count'],
    queryFn: () => provinceRepo.getCount(),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: (failureCount, error) => {
      if (isAbortError(error)) return false
      return failureCount < 2
    },
    throwOnError: (error) => !isAbortError(error),
  })

  const { data: departmentsCount = 0 } = useQuery({
    queryKey: ['departments-count'],
    queryFn: () => departmentRepo.getCount(),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: (failureCount, error) => {
      if (isAbortError(error)) return false
      return failureCount < 2
    },
    throwOnError: (error) => !isAbortError(error),
  })

  const { data: communesCount = 0 } = useQuery({
    queryKey: ['communes-count'],
    queryFn: () => communeRepo.getCount(),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: (failureCount, error) => {
      if (isAbortError(error)) return false
      return failureCount < 2
    },
    throwOnError: (error) => !isAbortError(error),
  })

  const { data: districtsCount = 0 } = useQuery({
    queryKey: ['districts-count'],
    queryFn: () => districtRepo.getCount(),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: (failureCount, error) => {
      if (isAbortError(error)) return false
      return failureCount < 2
    },
    throwOnError: (error) => !isAbortError(error),
  })

  const { data: quartersCount = 0 } = useQuery({
    queryKey: ['quarters-count'],
    queryFn: () => quarterRepo.getCount(),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: (failureCount, error) => {
      if (isAbortError(error)) return false
      return failureCount < 2
    },
    throwOnError: (error) => !isAbortError(error),
  })

  return {
    provincesCount,
    departmentsCount,
    communesCount,
    districtsCount,
    quartersCount,
  }
}
