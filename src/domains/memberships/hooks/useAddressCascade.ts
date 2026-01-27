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
import { RegisterFormData } from '@/schemas/schemas'
import { useProvinces, useDepartments, useDistricts } from '@/domains/infrastructure/geography/hooks/useGeographie'
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
   * NOTE: Depuis V2, les communes utilisent la recherche uniquement
   * Cette propriété est conservée pour compatibilité mais sera vide
   * Utiliser useCommuneSearch dans les Combobox pour la recherche
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

  // **IMPORTANT V2** : Les communes utilisent la recherche uniquement (pas de chargement complet)
  // Ne plus charger toutes les communes ici
  // Les Combobox utilisent useCommuneSearch pour la recherche
  const allCommunes: Commune[] = [] // Vide car recherche uniquement
  const isLoadingCommunes = false // Pas de chargement complet

  // Trouver les objets complets à partir des IDs
  const selectedProvince = provinces.find(p => p.id === selectedProvinceId)
  // NOTE: selectedCommune ne peut plus être trouvé depuis allCommunes (vide)
  // Le nom de la commune est stocké dans le formulaire (address.city)
  const selectedCommune: Commune | undefined = undefined
  const selectedDistrict = districts.find(d => d.id === selectedDistrictId)
  // NOTE: selectedQuarter ne peut plus être trouvé depuis quarters (recherche uniquement)
  // Le nom du quarter est stocké dans le formulaire (address.district)
  const selectedQuarter: Quarter | undefined = undefined

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

    // NOTE V2: selectedCommune est undefined car on ne charge plus toutes les communes
    // Le nom de la commune est mis à jour directement lors de la sélection dans le Combobox
    if (!selectedCommuneId) {
      setValue('address.city', '', { shouldValidate: true })
      setValue('address.district', '', { shouldValidate: true })
      setValue('address.arrondissement', '', { shouldValidate: true })
    }
  }, [selectedCommuneId, setValue, autoUpdateTextFields])

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

    // NOTE V2: selectedQuarter est undefined car on ne charge plus tous les quarters
    // Le nom du quarter est mis à jour directement lors de la sélection dans le Combobox
    if (!selectedQuarterId) {
      setValue('address.district', '', { shouldValidate: true })
    }
  }, [selectedQuarterId, setValue, autoUpdateTextFields])

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
      communes: isLoadingCommunes, // Toujours false (recherche uniquement)
      districts: isLoadingDistricts,
      quarters: false, // Toujours false (recherche uniquement)
    },
  }
}
