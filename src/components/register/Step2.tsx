'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  MapPin, 
  Home, 
  Building2, 
  CheckCircle,
  AlertCircle,
  Navigation,
  Globe,
  Info,
  Building,
  Search,
  Loader2,
  MapPinIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step2Props {
  form: any // Type du form de react-hook-form
}

interface PhotonResult {
  properties: {
    name: string
    city?: string
    state?: string
    country: string
    district?: string
    suburb?: string
    neighbourhood?: string
    osm_key: string
    osm_value: string
  }
  geometry: {
    coordinates: [number, number]
  }
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

// Fonction pour debounce
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function Step2({ form }: Step2Props) {
  const [districtQuery, setDistrictQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PhotonResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<PhotonResult | null>(null)

  const { register, watch, setValue, formState: { errors } } = form

  // Watch pour les animations
  const watchedFields = watch([
    'address.district',
    'address.city',
    'address.province', 
    'address.arrondissement',
    'address.additionalInfo'
  ])

  // Debounce la recherche
  const debouncedQuery = useDebounce(districtQuery, 500)

  // Fonction pour rechercher avec Photon API
  const searchWithPhoton = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      // Bounding box du Gabon: [ouest, sud, est, nord]
      const gabonBbox = '8.5,-4.0,14.8,2.3'
      
      const response = await fetch(
        `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&bbox=${gabonBbox}&limit=8&lang=fr`
      )
      
      if (response.ok) {
        const data = await response.json()
        // Filtrer pour ne garder que les résultats du Gabon
        const gabonResults = data.features.filter((result: PhotonResult) => 
          result.properties.country === 'Gabon' || result.properties.country === 'GA'
        )
        setSearchResults(gabonResults)
      }
    } catch (error) {
      console.error('Erreur lors de la recherche Photon:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Effet pour déclencher la recherche
  useEffect(() => {
    if (debouncedQuery) {
      searchWithPhoton(debouncedQuery)
      setShowResults(true)
    } else {
      setSearchResults([])
      setShowResults(false)
    }
  }, [debouncedQuery, searchWithPhoton])

  // Fonction pour sélectionner un résultat
  const handleLocationSelect = (result: PhotonResult) => {
    const { properties } = result
    
    setSelectedLocation(result)
    setDistrictQuery(properties.name)
    setShowResults(false)

    // Remplir automatiquement les champs disponibles
    setValue('address.district', properties.name)
    setValue('address.city', properties.city || properties.suburb || '')
    setValue('address.province', properties.state || '')
    
    // L'arrondissement reste à saisir manuellement par l'utilisateur
  }

  // Fonction pour formater l'affichage des résultats
  const formatResultDisplay = (result: PhotonResult) => {
    const { properties } = result
    const parts = [
      properties.name,
      properties.city || properties.suburb,
      properties.state
    ].filter(Boolean)
    
    return parts.join(', ')
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
          Recherchez votre quartier pour localiser automatiquement votre adresse
        </p>
      </div>

      {/* Illustration de carte stylisée */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 rounded-2xl p-6 sm:p-8 animate-in fade-in-0 zoom-in-95 duration-700 delay-200 w-full shadow-lg border border-[#224D62]/20">
        <div className="absolute top-0 right-0 w-32 sm:w-40 h-32 sm:h-40 bg-gradient-to-bl from-[#224D62]/20 to-transparent rounded-full opacity-30 -translate-y-12 sm:-translate-y-20 translate-x-12 sm:translate-x-20"></div>
        <div className="absolute bottom-0 left-0 w-24 sm:w-32 h-24 sm:h-32 bg-gradient-to-tr from-[#CBB171]/20 to-transparent rounded-full opacity-30 translate-y-10 sm:translate-y-16 -translate-x-10 sm:-translate-x-16"></div>
        <div className="relative flex items-center justify-center space-x-4 sm:space-x-6 py-4 sm:py-6">
          <div className="flex items-center space-x-3 text-[#224D62] text-sm sm:text-base">
            <Globe className="w-6 h-6 sm:w-7 sm:h-7" />
            <span className="font-bold">Géolocalisation</span>
          </div>
          <div className="w-3 h-3 bg-gradient-to-r from-[#224D62] to-[#CBB171] rounded-full animate-pulse shadow-lg"></div>
          <div className="flex items-center space-x-3 text-[#CBB171] text-sm sm:text-base">
            <Navigation className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="font-bold">Gabon</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 w-full">
        {/* Colonne de gauche - Recherche de quartier */}
        <div className="space-y-4 sm:space-y-6 w-full min-w-0">
          {/* Recherche de quartier */}
          <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 w-full min-w-0">
            <Label htmlFor="districtSearch" className="text-xs sm:text-sm font-medium text-[#224D62]">
              Rechercher votre quartier <span className="text-red-500">*</span>
            </Label>
            <div className="relative w-full min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
              <Input
                id="districtSearch"
                value={districtQuery}
                onChange={(e) => setDistrictQuery(e.target.value)}
                placeholder="Ex: Glass, Akanda, Lalala..."
                className={cn(
                  "pl-10 pr-12 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                  errors?.address?.district && "border-red-300 focus:border-red-500 bg-red-50/50",
                  selectedLocation && "border-[#CBB171] bg-[#CBB171]/5"
                )}
              />
              
              {/* Loading spinner */}
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-spin z-10" />
              )}
              
              {/* Success checkmark */}
              {selectedLocation && !isSearching && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200 z-10" />
              )}

              {/* Résultats de recherche */}
              {showResults && searchResults.length > 0 && (
                <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 w-full max-h-64 overflow-y-auto">
                  <CardContent className="p-2">
                    <div className="space-y-1">
                      {searchResults.map((result, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left hover:bg-[#224D62]/5 transition-colors text-xs sm:text-sm p-3"
                          onClick={() => handleLocationSelect(result)}
                        >
                          <div className="flex items-start space-x-2 w-full">
                            <MapPinIcon className="w-4 h-4 text-[#CBB171] mt-0.5 flex-shrink-0" />
                            <div className="text-left">
                              <div className="font-medium text-[#224D62]">
                                {result.properties.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatResultDisplay(result)}
                              </div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Aucun résultat */}
              {showResults && searchResults.length === 0 && !isSearching && districtQuery.length > 2 && (
                <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 w-full">
                  <CardContent className="p-4 text-center">
                    <div className="text-xs text-gray-500">
                      Aucun résultat trouvé pour "{districtQuery}"
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {errors?.address?.district && (
              <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.address.district.message}</span>
              </div>
            )}
          </div>

          {/* Informations automatiques */}
          {selectedLocation && (
            <div className="space-y-4 animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-200 w-full min-w-0">
              <div className="p-4 bg-[#CBB171]/5 rounded-lg border border-[#CBB171]/20">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-[#CBB171]" />
                  <span className="text-sm font-medium text-[#224D62]">
                    Localisation détectée
                  </span>
                </div>
                <div className="text-xs text-[#224D62]/80">
                  {formatResultDisplay(selectedLocation)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Colonne de droite - Champs automatiques */}
        <div className="space-y-4 sm:space-y-6 w-full min-w-0">
          {/* Ville (automatique) */}
          <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-100 w-full min-w-0">
            <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
              Ville <span className="text-red-500">*</span>
              <Badge variant="secondary" className="ml-2 bg-[#224D62]/10 text-[#224D62] text-[10px] sm:text-xs">
                Automatique
              </Badge>
            </Label>
            <div className="relative w-full min-w-0">
              <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                {...register('address.city')}
                disabled
                placeholder="Sélectionnez d'abord un quartier"
                className="pl-10 bg-gray-50 text-gray-600 border-gray-200 cursor-not-allowed w-full"
              />
            </div>
          </div>

          {/* Province (automatique) */}
          <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-200 w-full min-w-0">
            <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
              Province <span className="text-red-500">*</span>
              <Badge variant="secondary" className="ml-2 bg-[#224D62]/10 text-[#224D62] text-[10px] sm:text-xs">
                Automatique
              </Badge>
            </Label>
            <div className="relative w-full min-w-0">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                {...register('address.province')}
                disabled
                placeholder="Sélectionnez d'abord un quartier"
                className="pl-10 bg-gray-50 text-gray-600 border-gray-200 cursor-not-allowed w-full"
              />
            </div>
          </div>

          {/* Quartier (automatique) */}
          <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-250 w-full min-w-0">
            <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
              Quartier <span className="text-red-500">*</span>
              <Badge variant="secondary" className="ml-2 bg-[#224D62]/10 text-[#224D62] text-[10px] sm:text-xs">
                Automatique
              </Badge>
            </Label>
            <div className="relative w-full min-w-0">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                {...register('address.district')}
                disabled
                placeholder="Sélectionnez d'abord un quartier"
                className="pl-10 bg-gray-50 text-gray-600 border-gray-200 cursor-not-allowed w-full"
              />
            </div>
          </div>

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
                    errors?.address?.arrondissement && "border-red-300 focus:border-red-500 bg-red-50/50",
                    watchedFields[3] && !errors?.address?.arrondissement && "border-[#CBB171] bg-[#CBB171]/5"
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
              {watchedFields[3] && !errors?.address?.arrondissement && (
                <CheckCircle className="absolute right-8 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200 z-10" />
              )}
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
              <Info className="absolute left-3 top-3 w-4 h-4 text-[#CBB171]" />
              <Textarea
                id="additionalInfo"
                {...register('address.additionalInfo')}
                placeholder="Ex: Proche du marché, après la pharmacie, bâtiment bleu..."
                rows={4}
                className={cn(
                  "pl-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 resize-none w-full",
                  watchedFields[4] && "border-[#CBB171]/50 bg-[#CBB171]/5"
                )}
              />
            </div>
            <div className="text-xs text-gray-500 flex items-center space-x-1 break-words">
              <span>Ces détails aideront à mieux vous localiser</span>
              {watchedFields[4] && (
                <CheckCircle className="w-3 h-3 text-[#CBB171] animate-in zoom-in-50 duration-200" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages d'aide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
        <div className="p-4 sm:p-6 bg-gradient-to-r from-[#224D62]/5 to-[#CBB171]/5 rounded-xl border border-[#224D62]/20 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-600 w-full break-words shadow-lg">
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
        <div className="p-4 sm:p-6 bg-gradient-to-r from-[#CBB171]/5 to-[#224D62]/10 rounded-xl border border-[#CBB171]/20 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-700 w-full break-words shadow-lg">
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
    </div>
  )
}