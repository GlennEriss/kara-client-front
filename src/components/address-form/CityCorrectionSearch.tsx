'use client'

import React, { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Search, MapPin as MapPinIcon, Loader2, AlertCircle, Building } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PhotonResult } from '@/types/types'
import { UseFormReturn } from 'react-hook-form'
import { RegisterFormData } from '@/schemas/schemas'
import { AddressFormMediatorFactory } from '@/factories/AddressFormMediatorFactory'

interface CityCorrectionSearchProps {
  form: UseFormReturn<RegisterFormData>
}

export default function CityCorrectionSearch({ form }: CityCorrectionSearchProps) {
  const mediator = AddressFormMediatorFactory.create(form)

  const district = form.watch('address.district') || ''
  const city = form.watch('address.city') || ''

  const showSuggestion = Boolean(district && city && district.toLowerCase() === city.toLowerCase())

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PhotonResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query || query.trim().length < 3) {
      setResults([])
      return
    }
    let active = true
    setLoading(true)
    mediator.searchCitiesOnly(query).then((r) => {
      if (!active) return
      setResults(r)
    }).finally(() => setLoading(false))
    return () => { active = false }
  }, [query])

  if (!showSuggestion) return null

  return (
    <Card className="border-[#224D62]/20">
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-start space-x-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <p className="text-xs">
            Nous avons détecté que le <strong>quartier</strong> et la <strong>ville</strong> sont identiques.
            Si vous le souhaitez, recherchez uniquement la <strong>ville</strong> pour corriger ce champ sans modifier le quartier.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs sm:text-sm font-medium text-[#224D62] flex items-center space-x-2">
            <Building className="w-4 h-4 text-[#CBB171]" />
            <span>Rechercher une ville</span>
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Owendo, Port-Gentil..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Résultats */}
        <div className="space-y-2">
          {loading && (
            <div className="flex items-center text-sm text-gray-500">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Recherche en cours...
            </div>
          )}
          {!loading && results.length > 0 && (
            <div className="border rounded-md divide-y">
              {results.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => mediator.selectCityOnly(r)}
                  className={cn(
                    'w-full text-left px-3 py-2 hover:bg-[#224D62]/5 transition-colors'
                  )}
                >
                  <div className="flex items-center space-x-2">
                    <MapPinIcon className="w-4 h-4 text-[#CBB171]" />
                    <div className="text-sm">
                      <div className="font-medium">{r.properties.city || r.properties.name}</div>
                      <div className="text-xs text-gray-600">{r.properties.state}, {r.properties.country}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {!loading && query && results.length === 0 && (
            <div className="text-xs text-gray-500">Aucun résultat</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


