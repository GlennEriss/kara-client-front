'use client'

import React, { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Search,
  MapPin as MapPinIcon,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import { PhotonResult } from '@/types/types'
import { UseFormReturn } from 'react-hook-form'
import { RegisterFormData } from '@/schemas/schemas'
import { AddressFormMediatorFactory } from '@/factories/AddressFormMediatorFactory'

interface DistrictSearchFormProps {
  form: UseFormReturn<RegisterFormData>
}

export default function DistrictSearchForm({ form }: DistrictSearchFormProps) {
  const mediator = AddressFormMediatorFactory.create(form)

  // État local pour les résultats
  const [localResults, setLocalResults] = useState<PhotonResult[]>([])
  const [localShowResults, setLocalShowResults] = useState(false)

  // État local pour forcer le re-render
  const [localQuery, setLocalQuery] = useState('')

  // Accès aux erreurs du formulaire
  const errors = form.formState.errors

  const debouncedQuery = useDebounce(localQuery, 500)

  // Effect pour synchroniser avec le mediator quand une localisation est sélectionnée
  useEffect(() => {
    const selectedLocation = mediator.getSelectedLocation()
    if (selectedLocation) {
      setLocalQuery(selectedLocation.properties.name)
    }
  }, [mediator.getSelectedLocation()])

  // Effect pour déclencher la recherche avec le debounce
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery) {
        const results = await mediator.searchDistricts(debouncedQuery)

        // Mettre à jour les états locaux
        setLocalResults(results)
        setLocalShowResults(true)
      } else {
        mediator.setSearchResults([])
        mediator.hideResults()
        setLocalResults([])
        setLocalShowResults(false)
      }
    }

    performSearch()
  }, [debouncedQuery, mediator])

  // Gestionnaire de changement d'input
  const handleInputChange = (value: string) => {
    setLocalQuery(value)
    mediator.setDistrictQuery(value)
  }


  return (
    <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 w-full min-w-0">
      <Label htmlFor="districtSearch" className="text-xs sm:text-sm font-medium text-[#224D62]">
        Point de repères de votre quartier <span className="text-red-500">*</span>
      </Label>

      <div className="relative w-full min-w-0">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
        <Input
          id="districtSearch"
          value={localQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Ex: Glass, Akanda, Lalala..."
          className={cn(
            "pl-10 pr-12 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
            errors?.address?.district && "border-red-300 focus:border-red-500 bg-red-50/50",
            mediator.getSelectedLocation() && "border-[#CBB171] bg-[#CBB171]/5"
          )}
        />

        {/* Loading spinner */}
        {mediator.getIsSearching() && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-spin z-10" />
        )}

        {/* Success checkmark */}
        {mediator.getSelectedLocation() && !mediator.getIsSearching() && (
          <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200 z-10" />
        )}

        {/* Résultats de recherche */}
        {localShowResults && localResults.length > 0 && (
          <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 w-full max-h-64 overflow-y-auto">
            <CardContent className="p-2">
              <div className="space-y-1">
                {localResults.map((result, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left hover:bg-[#224D62]/5 transition-colors text-xs sm:text-sm p-3"
                    onClick={() => {
                      // Sélectionner la localisation via le mediator
                      mediator.selectLocation(result)

                      // Mettre à jour les états locaux
                      setLocalQuery(result.properties.name)
                      setLocalShowResults(false)
                      setLocalResults([])
                    }}
                  >
                    <div className="flex items-start space-x-2 w-full">
                      <MapPinIcon className="w-4 h-4 text-[#CBB171] mt-0.5 flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-medium text-[#224D62]">
                          {result.properties.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {mediator.formatResultDisplay(result)}
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
        {localShowResults && localResults.length === 0 && !mediator.getIsSearching() && localQuery.length > 2 && (
          <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 w-full">
            <CardContent className="p-4 text-center">
              <div className="text-xs text-gray-500">
                Aucun résultat trouvé pour "{localQuery}"
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Message d'erreur */}
      {errors?.address?.district && (
        <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
          <AlertCircle className="w-3 h-3" />
          <span>{errors.address.district.message}</span>
        </div>
      )}

    </div>
  )
}
