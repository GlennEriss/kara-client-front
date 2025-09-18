'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  MapPin, 
  Building,
  Search,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DistrictSearchForm, ProvinceAddressForm, CityAddressForm, DistrictAddressForm } from '@/components/address-form'

interface Step2Props {
  form: any // Type du form de react-hook-form
}

// Génération des options d'arrondissement (1 à 8)
const ARRONDISSEMENT_OPTIONS = Array.from({ length: 8 }, (_, i) => {
  const num = i + 1
  let suffix = 'ème'
  if (num === 1) suffix = 'er'
  return {
    value: `${num}${suffix} Arrondissement`,
    label: `${num}${suffix} Arrondissement`
  }
})

export default function Step2({ form }: Step2Props) {

  const { register, watch, setValue, formState: { errors }, clearErrors } = form

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
      {/* Header avec animation */}
      <div className="text-center space-y-3 animate-in fade-in-0 slide-in-from-top-4 duration-500 px-2">
        <div className="inline-flex items-center space-x-3 px-5 sm:px-6 py-3 bg-gradient-to-r from-[#224D62]/10 via-[#CBB171]/10 to-[#224D62]/10 rounded-full shadow-lg border border-[#224D62]/20">
          <MapPin className="w-6 h-6 text-[#224D62]" />
          <span className="text-[#224D62] font-bold text-base sm:text-lg">Adresse de résidence</span>
        </div>
        <p className="text-[#224D62]/80 text-sm sm:text-base break-words font-medium">
          Recherchez votre quartier pour localiser automatiquement votre adresse
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

      {/* Messages d'aide - déplacés avant le formulaire */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
        <div className="p-4 sm:p-6 bg-gradient-to-r from-[#224D62]/5 to-[#CBB171]/5 rounded-xl border border-[#224D62]/20 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-200 w-full break-words shadow-lg">
          <div className="flex items-start space-x-3">
            <Search className="w-6 h-6 text-[#CBB171] flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm sm:text-base font-bold text-[#224D62]">Recherche intelligente</p>
              <p className="text-sm text-[#224D62]/80">
                Tapez le nom de votre quartier et sélectionnez dans les suggestions
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 bg-gradient-to-r from-[#CBB171]/5 to-[#224D62]/10 rounded-xl border border-[#CBB171]/20 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-300 w-full break-words shadow-lg">
          <div className="flex items-start space-x-3">
            <MapPin className="w-6 h-6 text-[#CBB171] flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm sm:text-base font-bold text-[#224D62]">Géolocalisation</p>
              <p className="text-sm text-[#224D62]/80">
                Ville et province remplies automatiquement. Saisissez l'arrondissement manuellement.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 w-full">
        {/* Colonne de gauche - Recherche de quartier */}
        <div className="space-y-4 sm:space-y-6 w-full min-w-0">
          {/* Recherche de quartier */}
          <DistrictSearchForm form={form} />
        </div>

        {/* Colonne de droite - Champs automatiques */}
        <div className="space-y-4 sm:space-y-6 w-full min-w-0">
          
                  {/* Province */}
                  <ProvinceAddressForm form={form} />

                  {/* Ville */}
                  <CityAddressForm form={form} />

                  {/* Quartier */}
                  <DistrictAddressForm form={form} />

          {/* Arrondissement (manuel) */}
          <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-300 w-full min-w-0">
            <Label htmlFor="arrondissement" className="text-xs sm:text-sm font-medium text-[#224D62]">
              Arrondissement <span className="text-red-500">*</span>
              <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800 text-[10px] sm:text-xs">
                Manuel
              </Badge>
            </Label>
            <div className="relative w-full min-w-0">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
              <Select
                value={watch('address.arrondissement') || ''}
                onValueChange={(value) => setValue('address.arrondissement', value)}
              >
                <SelectTrigger 
                  className={cn(
                    "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                  errors?.address?.arrondissement && "border-red-300 focus:border-red-500 bg-red-50/50"
                  )}
                >
                  <SelectValue placeholder="Sélectionnez un arrondissement..." />
                </SelectTrigger>
                <SelectContent>
                  {ARRONDISSEMENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {errors?.address?.arrondissement && (
              <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-right-2 duration-300 break-words">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.address.arrondissement.message}</span>
              </div>
            )}
          </div>

          {/* Informations complémentaires (toujours actif) */}
          <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-400 w-full min-w-0">
            <Label htmlFor="additionalInfo" className="text-xs sm:text-sm font-medium text-[#224D62]">
              Informations complémentaires
              <Badge variant="secondary" className="ml-2 bg-[#CBB171]/10 text-[#CBB171] text-[10px] sm:text-xs">
                Optionnel
              </Badge>
            </Label>
            <div className="relative w-full min-w-0">
              <Textarea
                id="additionalInfo"
                {...register('address.additionalInfo')}
                placeholder="Ex: Proche du marché, après la pharmacie, bâtiment bleu..."
                rows={4}
                className={cn(
                  "pl-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 resize-none w-full"
                )}
              />
            </div>
            <div className="text-xs text-gray-500 flex items-center space-x-1 break-words">
              <span>Ces détails aideront à mieux vous localiser</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}