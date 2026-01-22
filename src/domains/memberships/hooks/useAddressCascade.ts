/**
 * Hook pour gérer la cascade d'adresse : Province → Ville → Arrondissement → Quartier
 * 
 * Ce hook centralise la logique de :
 * - Chargement des données géographiques en cascade
 * - Mise à jour automatique des champs texte du formulaire quand les IDs changent
 * - Réinitialisation en cascade quand un niveau supérieur change
 */

import { useEffect, useMemo } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { useQueries } from '@tanstack/react-query'
import { RegisterFormData } from '@/schemas/schemas'
import { useProvinces, useDepartments, useDistricts, useQuarters } from '@/domains/infrastructure/geography/hooks/useGeographie'
import { ServiceFactory } from '@/factories/ServiceFactory'
import type { Province, Commune, District, Quarter } from '@/domains/infrastructure/geography/entities/geography.types'

export interface UseAddressCascadeOptions {
  /**
   * Le formulaire react-hook-form
   */
  form: UseFormReturn<RegisterFormData>
  
  /**
   * Si true, met à jour automatiquement les champs texte (province, city, arrondissement, district)
   * à partir des IDs sélectionnés. Par défaut: true
   */
  autoUpdateTextFields?: boolean
}

export interface UseAddressCascadeReturn {
  /**
   * IDs sélectionnés
   */
  selectedIds: {
    provinceId: string
    communeId: string
    districtId: string
    quarterId: string
  }
  
  /**
   * Objets complets sélectionnés
   */
  selectedEntities: {
    province: Province | undefined
    commune: Commune | undefined
    district: District | undefined
    quarter: Quarter | undefined
  }
  
  /**
   * Toutes les communes disponibles pour la province sélectionnée
   */
  allCommunes: Commune[]
  
  /**
   * États de chargement
   */
  isLoading: {
    provinces: boolean
    departments: boolean
    communes: boolean
    districts: boolean
    quarters: boolean
  }
}

/**
 * Hook pour gérer la cascade d'adresse dans le formulaire d'adhésion
 * 
 * @example
 * ```tsx
 * const { selectedIds, selectedEntities, allCommunes, isLoading } = useAddressCascade({ form })
 * 
 * // Utiliser selectedIds.provinceId pour passer aux Combobox
 * <CommuneCombobox provinceId={selectedIds.provinceId} />
 * ```
 */
export function useAddressCascade({ 
  form, 
  autoUpdateTextFields = true 
}: UseAddressCascadeOptions): UseAddressCascadeReturn {
  const { watch, setValue } = form

  // Surveiller les IDs sélectionnés
  const selectedProvinceId = watch('address.provinceId') || ''
  const selectedCommuneId = watch('address.communeId') || ''
  const selectedDistrictId = watch('address.districtId') || ''
  const selectedQuarterId = watch('address.quarterId') || ''

  // Charger les données géographiques
  const { data: provinces = [], isLoading: isLoadingProvinces } = useProvinces()
  const { data: departments = [], isLoading: isLoadingDepartments } = useDepartments(
    selectedProvinceId || undefined
  )
  const { data: districts = [], isLoading: isLoadingDistricts } = useDistricts(
    selectedCommuneId || undefined
  )
  const { data: quarters = [], isLoading: isLoadingQuarters } = useQuarters(
    selectedDistrictId || undefined
  )

  // Charger toutes les communes de tous les départements de la province sélectionnée
  const communeQueries = useQueries({
    queries: departments.length > 0 && selectedProvinceId
      ? departments.map(dept => ({
          queryKey: ['communes', dept.id],
          queryFn: async () => {
            const service = ServiceFactory.getGeographieService()
            return service.getCommunesByDepartmentId(dept.id)
          },
          enabled: !!selectedProvinceId && departments.length > 0,
          staleTime: 5 * 60 * 1000,
        }))
      : []
  })

  const isLoadingCommunes = communeQueries.some(query => query.isLoading)

  // Agrégation et tri des communes
  const allCommunes = useMemo(() => {
    const communes: Commune[] = []
    communeQueries.forEach(query => {
      if (query.data) {
        communes.push(...query.data)
      }
    })
    // Éliminer les doublons par ID et trier par nom
    const uniqueCommunes = communes.filter((commune, index, self) =>
      index === self.findIndex(c => c.id === commune.id)
    )
    return uniqueCommunes.sort((a, b) => 
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
  }, [communeQueries])

  // Trouver les objets complets à partir des IDs
  const selectedProvince = provinces.find(p => p.id === selectedProvinceId)
  const selectedCommune = allCommunes.find(c => c.id === selectedCommuneId)
  const selectedDistrict = districts.find(d => d.id === selectedDistrictId)
  const selectedQuarter = quarters.find(q => q.id === selectedQuarterId)

  // Mise à jour automatique des champs texte quand les sélections changent
  useEffect(() => {
    if (!autoUpdateTextFields) return

    if (selectedProvince) {
      setValue('address.province', selectedProvince.name, { shouldValidate: true })
    } else if (!selectedProvinceId) {
      setValue('address.province', '', { shouldValidate: true })
    }
  }, [selectedProvince, selectedProvinceId, setValue, autoUpdateTextFields])

  useEffect(() => {
    if (!autoUpdateTextFields) return

    if (selectedCommune) {
      setValue('address.city', selectedCommune.name, { shouldValidate: true })
    } else if (!selectedCommuneId) {
      setValue('address.city', '', { shouldValidate: true })
      setValue('address.district', '', { shouldValidate: true })
      setValue('address.arrondissement', '', { shouldValidate: true })
    }
  }, [selectedCommune, selectedCommuneId, setValue, autoUpdateTextFields])

  useEffect(() => {
    if (!autoUpdateTextFields) return

    if (selectedDistrict) {
      setValue('address.arrondissement', selectedDistrict.name, { shouldValidate: true })
    } else if (!selectedDistrictId) {
      setValue('address.arrondissement', '', { shouldValidate: true })
      setValue('address.district', '', { shouldValidate: true })
    }
  }, [selectedDistrict, selectedDistrictId, setValue, autoUpdateTextFields])

  useEffect(() => {
    if (!autoUpdateTextFields) return

    if (selectedQuarter) {
      setValue('address.district', selectedQuarter.name, { shouldValidate: true })
    } else if (!selectedQuarterId) {
      setValue('address.district', '', { shouldValidate: true })
    }
  }, [selectedQuarter, selectedQuarterId, setValue, autoUpdateTextFields])

  return {
    selectedIds: {
      provinceId: selectedProvinceId,
      communeId: selectedCommuneId,
      districtId: selectedDistrictId,
      quarterId: selectedQuarterId,
    },
    selectedEntities: {
      province: selectedProvince,
      commune: selectedCommune,
      district: selectedDistrict,
      quarter: selectedQuarter,
    },
    allCommunes,
    isLoading: {
      provinces: isLoadingProvinces,
      departments: isLoadingDepartments,
      communes: isLoadingCommunes,
      districts: isLoadingDistricts,
      quarters: isLoadingQuarters,
    },
  }
}
