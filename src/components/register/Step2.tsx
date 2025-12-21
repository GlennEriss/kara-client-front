'use client'

import React, { useMemo, useEffect } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  MapPin,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProvinces, useDepartments, useDistricts, useQuarters } from '@/hooks/useGeographie'
import { ServiceFactory } from '@/factories/ServiceFactory'
import type { RegisterFormData } from '@/types/types'
import type { Commune } from '@/types/types'

interface Step2Props {
  form: any // Type du form de react-hook-form
}

export default function Step2({ form }: Step2Props) {
  const { register, watch, setValue, formState: { errors } } = form

  // Surveiller les valeurs sélectionnées pour le chargement en cascade
  const selectedProvinceId = watch('address.provinceId') || ''
  const selectedCommuneId = watch('address.communeId') || ''
  const selectedDistrictId = watch('address.districtId') || ''
  const selectedQuarterId = watch('address.quarterId') || ''

  // Charger les provinces
  const { data: provinces = [], isLoading: isLoadingProvinces } = useProvinces()

  // Charger les départements de la province sélectionnée
  const { data: departments = [], isLoading: isLoadingDepartments } = useDepartments(
    selectedProvinceId || undefined
  )

  // Charger toutes les communes de tous les départements de la province sélectionnée
  const communeQueries = useQueries({
    queries: departments.length > 0 
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
    return uniqueCommunes.sort((a, b) => a.name.localeCompare(b.name))
  }, [communeQueries])

  const isLoadingCommunes = communeQueries.some(query => query.isLoading)

  // Charger les arrondissements (districts) de la commune sélectionnée
  const { data: districts = [], isLoading: isLoadingDistricts } = useDistricts(
    selectedCommuneId || undefined
  )

  // Charger les quartiers (quarters) de l'arrondissement sélectionné
  const { data: quarters = [], isLoading: isLoadingQuarters } = useQuarters(
    selectedDistrictId || undefined
  )

  // Trouver les objets complets à partir des IDs pour remplir les champs texte
  const selectedProvince = provinces.find(p => p.id === selectedProvinceId)
  const selectedCommune = allCommunes.find(c => c.id === selectedCommuneId)
  const selectedDistrict = districts.find(d => d.id === selectedDistrictId)
  const selectedQuarter = quarters.find(q => q.id === selectedQuarterId)

  // Mettre à jour les champs texte quand les sélections changent
  useEffect(() => {
    if (selectedProvince) {
      setValue('address.province', selectedProvince.name, { shouldValidate: true })
    } else if (!selectedProvinceId) {
      setValue('address.province', '', { shouldValidate: true })
    }
  }, [selectedProvince, selectedProvinceId, setValue])

  useEffect(() => {
    if (selectedCommune) {
      setValue('address.city', selectedCommune.name, { shouldValidate: true })
    } else if (!selectedCommuneId) {
      setValue('address.city', '', { shouldValidate: true })
      setValue('address.district', '', { shouldValidate: true })
      setValue('address.arrondissement', '', { shouldValidate: true })
    }
  }, [selectedCommune, selectedCommuneId, setValue])

  useEffect(() => {
    if (selectedDistrict) {
      setValue('address.arrondissement', selectedDistrict.name, { shouldValidate: true })
    } else if (!selectedDistrictId) {
      setValue('address.arrondissement', '', { shouldValidate: true })
      setValue('address.district', '', { shouldValidate: true })
    }
  }, [selectedDistrict, selectedDistrictId, setValue])

  useEffect(() => {
    if (selectedQuarter) {
      setValue('address.district', selectedQuarter.name, { shouldValidate: true })
    } else if (!selectedQuarterId) {
      setValue('address.district', '', { shouldValidate: true })
    }
  }, [selectedQuarter, selectedQuarterId, setValue])

  // Réinitialiser les sélections en cascade quand un niveau supérieur change
  const handleProvinceChange = (provinceId: string) => {
    setValue('address.provinceId', provinceId, { shouldValidate: true })
    setValue('address.communeId', '', { shouldValidate: true })
    setValue('address.districtId', '', { shouldValidate: true })
    setValue('address.quarterId', '', { shouldValidate: true })
  }

  const handleCommuneChange = (communeId: string) => {
    setValue('address.communeId', communeId, { shouldValidate: true })
    setValue('address.districtId', '', { shouldValidate: true })
    setValue('address.quarterId', '', { shouldValidate: true })
  }

  const handleDistrictChange = (districtId: string) => {
    setValue('address.districtId', districtId, { shouldValidate: true })
    setValue('address.quarterId', '', { shouldValidate: true })
  }

  const handleQuarterChange = (quarterId: string) => {
    setValue('address.quarterId', quarterId, { shouldValidate: true })
  }

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
      {/* Header avec animation */}
      <div className="text-center space-y-3 animate-in fade-in-0 slide-in-from-top-4 duration-500 px-2">
        <div className="inline-flex items-center space-x-3 px-5 sm:px-6 py-3 bg-gradient-to-r from-[#224D62]/10 via-[#CBB171]/10 to-[#224D62]/10 rounded-full shadow-lg border border-[#224D62]/20">
          <MapPin className="w-6 h-6 text-[#224D62]" />
          <span className="text-[#224D62] font-bold text-base sm:text-lg">Adresse de résidence</span>
        </div>
        <p className="text-[#224D62]/80 text-sm sm:text-base break-words font-medium">
          Sélectionnez votre localisation pour compléter votre adresse
        </p>
      </div>

      {/* Illustration de carte stylisée */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 rounded-2xl p-6 sm:p-8 animate-in fade-in-0 zoom-in-95 duration-700 delay-200 w-full shadow-lg border border-[#224D62]/20">
        <div className="absolute top-0 right-0 w-32 sm:w-40 h-32 sm:h-40 bg-gradient-to-bl from-[#224D62]/20 to-transparent rounded-full opacity-30 -translate-y-12 sm:-translate-y-20 translate-x-12 sm:translate-x-20"></div>
        <div className="absolute bottom-0 left-0 w-24 sm:w-32 h-24 sm:h-32 bg-gradient-to-tr from-[#CBB171]/20 to-transparent rounded-full opacity-30 translate-y-10 sm:translate-y-16 -translate-x-10 sm:-translate-x-16"></div>
        <div className="relative flex items-center justify-center space-x-4 sm:space-x-6 py-4 sm:py-6">
          <div className="flex items-center space-x-3 text-[#224D62] text-sm sm:text-base">
            <span className="font-bold">Géolocalisation</span>
          </div>
          <div className="w-3 h-3 bg-gradient-to-r from-[#224D62] to-[#CBB171] rounded-full animate-pulse shadow-lg"></div>
          <div className="flex items-center space-x-3 text-[#CBB171] text-sm sm:text-base">
            <span className="font-bold">Gabon</span>
          </div>
        </div>
      </div>

      {/* Formulaire avec les 4 selects en cascade */}
      <div className="space-y-4 sm:space-y-6 w-full">
        {/* Province */}
        <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-200 w-full">
          <Label htmlFor="province" className="text-xs sm:text-sm font-medium text-[#224D62]">
            Province <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedProvinceId}
            onValueChange={handleProvinceChange}
            disabled={isLoadingProvinces}
          >
            <SelectTrigger
              id="province"
              className={cn(
                "w-full border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20",
                errors.address?.province && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              )}
            >
              <SelectValue placeholder="Sélectionnez une province..." />
            </SelectTrigger>
            <SelectContent>
              {isLoadingProvinces ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                </div>
              ) : (
                provinces.map((province) => (
                  <SelectItem key={province.id} value={province.id}>
                    {province.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {errors.address?.province && (
            <p className="text-xs text-red-500">{errors.address.province.message as string}</p>
          )}
        </div>

        {/* Ville (Commune) */}
        <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-300 w-full">
          <Label htmlFor="city" className="text-xs sm:text-sm font-medium text-[#224D62]">
            Ville <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedCommuneId}
            onValueChange={handleCommuneChange}
            disabled={!selectedProvinceId || isLoadingCommunes || isLoadingDepartments}
          >
            <SelectTrigger
              id="city"
              className={cn(
                "w-full border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20",
                errors.address?.city && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              )}
            >
              <SelectValue placeholder={
                !selectedProvinceId 
                  ? "Sélectionnez d'abord une province..." 
                  : isLoadingCommunes || isLoadingDepartments
                  ? "Chargement..."
                  : "Sélectionnez une ville..."
              } />
            </SelectTrigger>
            <SelectContent>
              {isLoadingCommunes || isLoadingDepartments ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                </div>
              ) : (
                allCommunes.map((commune) => (
                  <SelectItem key={commune.id} value={commune.id}>
                    {commune.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {errors.address?.city && (
            <p className="text-xs text-red-500">{errors.address.city.message as string}</p>
          )}
        </div>

        {/* Arrondissement (District) */}
        <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-400 w-full">
          <Label htmlFor="arrondissement" className="text-xs sm:text-sm font-medium text-[#224D62]">
            Arrondissement <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedDistrictId}
            onValueChange={handleDistrictChange}
            disabled={!selectedCommuneId || isLoadingDistricts}
          >
            <SelectTrigger
              id="arrondissement"
              className={cn(
                "w-full border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20",
                errors.address?.arrondissement && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              )}
            >
              <SelectValue placeholder={
                !selectedCommuneId 
                  ? "Sélectionnez d'abord une ville..." 
                  : isLoadingDistricts
                  ? "Chargement..."
                  : "Sélectionnez un arrondissement..."
              } />
            </SelectTrigger>
            <SelectContent>
              {isLoadingDistricts ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                </div>
              ) : (
                districts.map((district) => (
                  <SelectItem key={district.id} value={district.id}>
                    {district.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {errors.address?.arrondissement && (
            <p className="text-xs text-red-500">{errors.address.arrondissement.message as string}</p>
          )}
        </div>

        {/* Quartier (Quarter) */}
        <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-500 w-full">
          <Label htmlFor="quarter" className="text-xs sm:text-sm font-medium text-[#224D62]">
            Quartier <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedQuarterId}
            onValueChange={handleQuarterChange}
            disabled={!selectedDistrictId || isLoadingQuarters}
          >
            <SelectTrigger
              id="quarter"
              className={cn(
                "w-full border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20",
                errors.address?.district && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              )}
            >
              <SelectValue placeholder={
                !selectedDistrictId 
                  ? "Sélectionnez d'abord un arrondissement..." 
                  : isLoadingQuarters
                  ? "Chargement..."
                  : "Sélectionnez un quartier..."
              } />
            </SelectTrigger>
            <SelectContent>
              {isLoadingQuarters ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                </div>
              ) : (
                quarters.map((quarter) => (
                  <SelectItem key={quarter.id} value={quarter.id}>
                    {quarter.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {errors.address?.district && (
            <p className="text-xs text-red-500">{errors.address.district.message as string}</p>
          )}
        </div>

        {/* Informations complémentaires */}
        <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-600 w-full">
          <Label htmlFor="additionalInfo" className="text-xs sm:text-sm font-medium text-[#224D62]">
            Informations complémentaires
            <Badge variant="secondary" className="ml-2 bg-[#CBB171]/10 text-[#CBB171] text-[10px] sm:text-xs">
              Optionnel
            </Badge>
          </Label>
          <div className="relative w-full">
            <Textarea
              id="additionalInfo"
              {...register('address.additionalInfo')}
              placeholder="Ex: Proche du marché, après la pharmacie, bâtiment bleu..."
              rows={4}
              className={cn(
                "w-full border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 resize-none"
              )}
            />
          </div>
          <div className="text-xs text-gray-500 flex items-center space-x-1 break-words">
            <span>Ces détails aideront à mieux vous localiser</span>
          </div>
        </div>
      </div>
    </div>
  )
}
