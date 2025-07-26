'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin, 
  Home, 
  Building2, 
  Map,
  CheckCircle,
  AlertCircle,
  Navigation,
  Globe,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step2Props {
  form: any // Type du form de react-hook-form
}

// Suggestions de provinces gabonaises (exemple)
const PROVINCE_SUGGESTIONS = [
  'Estuaire', 'Haut-Ogooué', 'Moyen-Ogooué', 'Ngounié', 
  'Nyanga', 'Ogooué-Ivindo', 'Ogooué-Lolo', 'Ogooué-Maritime', 'Woleu-Ntem'
]

// Suggestions de villes populaires
const CITY_SUGGESTIONS = [
  'Libreville', 'Port-Gentil', 'Franceville', 'Oyem', 
  'Mouila', 'Lambaréné', 'Tchibanga', 'Koulamoutou', 'Makokou'
]

export default function Step2({ form }: Step2Props) {
  const [showProvinceSuggestions, setShowProvinceSuggestions] = useState(false)
  const [showCitySuggestions, setShowCitySuggestions] = useState(false)

  const { register, watch, setValue, formState: { errors } } = form

  // Watch pour les animations et suggestions
  const watchedFields = watch([
    'address.province',
    'address.city', 
    'address.district',
    'address.additionalInfo'
  ])

  const handleSuggestionClick = (field: string, value: string) => {
    setValue(field, value)
    if (field === 'address.province') setShowProvinceSuggestions(false)
    if (field === 'address.city') setShowCitySuggestions(false)
  }

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
      {/* Header avec animation */}
      <div className="text-center space-y-2 animate-in fade-in-0 slide-in-from-top-4 duration-500 px-2">
        <div className="inline-flex items-center space-x-2 px-3 sm:px-4 py-2 bg-[#224D62]/10 rounded-full">
          <MapPin className="w-5 h-5 text-[#224D62]" />
          <span className="text-[#224D62] font-medium text-sm sm:text-base">Adresse de résidence</span>
        </div>
        <p className="text-gray-600 text-xs sm:text-sm break-words">
          Indiquez votre lieu de résidence actuel pour compléter votre profil
        </p>
      </div>

      {/* Illustration de carte stylisée */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 rounded-2xl p-4 sm:p-6 animate-in fade-in-0 zoom-in-95 duration-700 delay-200 w-full">
        <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-[#CBB171]/10 rounded-full -translate-y-10 sm:-translate-y-16 translate-x-10 sm:translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-16 sm:w-24 h-16 sm:h-24 bg-[#224D62]/10 rounded-full translate-y-8 sm:translate-y-12 -translate-x-8 sm:-translate-x-12"></div>
        <div className="relative flex items-center justify-center space-x-2 sm:space-x-4 py-2 sm:py-4">
          <div className="flex items-center space-x-2 text-[#224D62] text-xs sm:text-base">
            <Globe className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="font-medium">Localisation</span>
          </div>
          <div className="w-2 h-2 bg-[#CBB171] rounded-full animate-pulse"></div>
          <div className="flex items-center space-x-2 text-[#CBB171] text-xs sm:text-sm">
            <Navigation className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm">Gabon</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 w-full">
        {/* Colonne de gauche */}
        <div className="space-y-4 sm:space-y-6 w-full min-w-0">
          {/* Province */}
          <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 w-full min-w-0">
            <Label htmlFor="province" className="text-xs sm:text-sm font-medium text-[#224D62]">
              Province <span className="text-red-500">*</span>
            </Label>
            <div className="relative w-full min-w-0">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
              <Input
                id="province"
                {...register('address.province')}
                placeholder="Ex: Estuaire"
                onFocus={() => setShowProvinceSuggestions(true)}
                onBlur={() => setTimeout(() => setShowProvinceSuggestions(false), 200)}
                className={cn(
                  "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                  errors?.address?.province && "border-red-300 focus:border-red-500 bg-red-50/50",
                  watchedFields[0] && !errors?.address?.province && "border-green-300 bg-green-50/30"
                )}
              />
              {watchedFields[0] && !errors?.address?.province && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500 animate-in zoom-in-50 duration-200 z-10" />
              )}
              {/* Suggestions provinces */}
              {showProvinceSuggestions && (
                <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 w-full">
                  <CardContent className="p-2">
                    <div className="space-y-1">
                      {PROVINCE_SUGGESTIONS.map((province) => (
                        <Button
                          key={province}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left hover:bg-[#224D62]/5 transition-colors text-xs sm:text-sm"
                          onMouseDown={() => handleSuggestionClick('address.province', province)}
                        >
                          {province}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            {errors?.address?.province && (
              <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.address.province.message}</span>
              </div>
            )}
          </div>

          {/* Ville */}
          <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-200 w-full min-w-0">
            <Label htmlFor="city" className="text-xs sm:text-sm font-medium text-[#224D62]">
              Ville <span className="text-red-500">*</span>
            </Label>
            <div className="relative w-full min-w-0">
              <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
              <Input
                id="city"
                {...register('address.city')}
                placeholder="Ex: Libreville"
                onFocus={() => setShowCitySuggestions(true)}
                onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
                className={cn(
                  "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                  errors?.address?.city && "border-red-300 focus:border-red-500 bg-red-50/50",
                  watchedFields[1] && !errors?.address?.city && "border-green-300 bg-green-50/30"
                )}
              />
              {watchedFields[1] && !errors?.address?.city && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500 animate-in zoom-in-50 duration-200 z-10" />
              )}
              {/* Suggestions villes */}
              {showCitySuggestions && (
                <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 w-full">
                  <CardContent className="p-2">
                    <div className="space-y-1">
                      {CITY_SUGGESTIONS.map((city) => (
                        <Button
                          key={city}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left hover:bg-[#224D62]/5 transition-colors text-xs sm:text-sm"
                          onMouseDown={() => handleSuggestionClick('address.city', city)}
                        >
                          {city}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            {errors?.address?.city && (
              <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.address.city.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Colonne de droite */}
        <div className="space-y-4 sm:space-y-6 w-full min-w-0">
          {/* Quartier */}
          <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-100 w-full min-w-0">
            <Label htmlFor="district" className="text-xs sm:text-sm font-medium text-[#224D62]">
              Quartier <span className="text-red-500">*</span>
            </Label>
            <div className="relative w-full min-w-0">
              <Map className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
              <Input
                id="district"
                {...register('address.district')}
                placeholder="Ex: Glass, Akanda, Lalala..."
                className={cn(
                  "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                  errors?.address?.district && "border-red-300 focus:border-red-500 bg-red-50/50",
                  watchedFields[2] && !errors?.address?.district && "border-green-300 bg-green-50/30"
                )}
              />
              {watchedFields[2] && !errors?.address?.district && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500 animate-in zoom-in-50 duration-200" />
              )}
            </div>
            {errors?.address?.district && (
              <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-right-2 duration-300 break-words">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.address.district.message}</span>
              </div>
            )}
          </div>

          {/* Informations complémentaires */}
          <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-300 w-full min-w-0">
            <Label htmlFor="additionalInfo" className="text-xs sm:text-sm font-medium text-[#224D62]">
              Informations complémentaires
              <Badge variant="secondary" className="ml-2 bg-[#CBB171]/10 text-[#CBB171] text-[10px] sm:text-xs">
                Optionnel
              </Badge>
            </Label>
            <div className="relative w-full min-w-0">
              <Info className="absolute left-3 top-3 w-4 h-4 text-[#CBB171]" />
              <Textarea
                id="additionalInfo"
                {...register('address.additionalInfo')}
                placeholder="Ex: Proche du marché, après la pharmacie, bâtiment bleu..."
                rows={4}
                className={cn(
                  "pl-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 resize-none w-full",
                  watchedFields[3] && "border-[#CBB171]/50 bg-[#CBB171]/5"
                )}
              />
            </div>
            <div className="text-xs text-gray-500 flex items-center space-x-1 break-words">
              <span>Ces détails aideront à mieux vous localiser</span>
              {watchedFields[3] && (
                <CheckCircle className="w-3 h-3 text-green-500 animate-in zoom-in-50 duration-200" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Carte interactive (placeholder) */}
      <Card className="border-2 border-dashed border-[#224D62]/20 bg-gradient-to-br from-[#224D62]/5 to-[#CBB171]/5 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-500 w-full">
        <CardContent className="p-4 sm:p-8 w-full">
          <div className="text-center space-y-4 w-full">
            <div className="w-12 sm:w-16 h-12 sm:h-16 mx-auto bg-[#224D62]/10 rounded-full flex items-center justify-center">
              <MapPin className="w-8 h-8 text-[#224D62] animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-medium text-[#224D62] break-words">
                Localisation sur la carte
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 break-words">
                Une fois vos informations saisies, votre position sera affichée sur la carte
              </p>
              {(watchedFields[0] || watchedFields[1] || watchedFields[2]) && (
                <div className="inline-flex items-center space-x-2 bg-[#224D62]/10 px-2 sm:px-3 py-1 rounded-full animate-in zoom-in-50 duration-300">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] sm:text-xs text-[#224D62] font-medium">
                    Données détectées
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages d'aide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
        <div className="p-3 sm:p-4 bg-[#224D62]/5 rounded-lg border border-[#224D62]/20 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-600 w-full break-words">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-[#224D62] mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-medium text-[#224D62]">Conseil</p>
              <p className="text-[10px] sm:text-xs text-gray-600">
                Soyez précis dans votre adresse pour faciliter les futurs contacts
              </p>
            </div>
          </div>
        </div>
        <div className="p-3 sm:p-4 bg-[#CBB171]/5 rounded-lg border border-[#CBB171]/20 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-700 w-full break-words">
          <div className="flex items-start space-x-2">
            <MapPin className="w-4 h-4 text-[#CBB171] mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-medium text-[#CBB171]">Sécurité</p>
              <p className="text-[10px] sm:text-xs text-gray-600">
                Vos données de localisation sont protégées et confidentielles
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}