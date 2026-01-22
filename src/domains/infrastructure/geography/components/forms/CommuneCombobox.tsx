'use client'

import React, { useState, useMemo } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { RegisterFormData } from '@/schemas/schemas'
import { useQueries } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useDepartments } from '../../hooks/useGeographie'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Check, ChevronsUpDown, Loader2, MapPin, AlertCircle, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import type { Commune } from '../../entities/geography.types'

interface CommuneComboboxProps {
  form: UseFormReturn<RegisterFormData>
  provinceId?: string
  onAddNew?: () => void // Callback pour ouvrir le modal d'ajout
  disabled?: boolean
}

export default function CommuneCombobox({ form, provinceId, onAddNew, disabled = false }: CommuneComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { watch, setValue, formState: { errors } } = form
  
  const selectedCommuneId = watch('address.communeId') || ''
  const selectedProvinceId = provinceId || watch('address.provinceId') || ''
  
  // Charger les départements de la province sélectionnée
  const { data: departments = [], isLoading: isLoadingDepartments } = useDepartments(
    selectedProvinceId || undefined
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

  const isLoadingCommunes = communeQueries.some(query => query.isLoading)
  const isLoading = isLoadingCommunes || isLoadingDepartments
  
  // Trier et filtrer les communes
  const filteredCommunes = useMemo(() => {
    if (!searchQuery.trim()) return allCommunes
    const query = searchQuery.toLowerCase()
    return allCommunes.filter(commune => 
      commune.name.toLowerCase().includes(query) ||
      commune.postalCode?.toLowerCase().includes(query) ||
      commune.alias?.toLowerCase().includes(query)
    )
  }, [allCommunes, searchQuery])

  const selectedCommune = filteredCommunes.find(c => c.id === selectedCommuneId)

  const handleSelect = (value: string) => {
    // cmdk passe la valeur du prop 'value' (commune.name), on doit trouver l'ID correspondant
    const commune = filteredCommunes.find(c => c.name.toLowerCase() === value.toLowerCase())
    if (!commune) return
    
    // Sélectionner la commune (sans toggle pour éviter les bugs de double-clic)
    setValue('address.communeId', commune.id, { shouldValidate: true })
    // Réinitialiser les sélections en cascade
    setValue('address.districtId', '', { shouldValidate: true })
    setValue('address.quarterId', '', { shouldValidate: true })
    setOpen(false)
    setSearchQuery('')
  }

  const isDisabled = disabled || !selectedProvinceId || isLoading

  return (
    <div className="space-y-2 w-full">
      <Label htmlFor="city" className="text-xs sm:text-sm font-medium text-[#224D62]">
        Ville <span className="text-red-500">*</span>
      </Label>
      
      <div className="flex items-center gap-2 w-full min-w-0">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={isDisabled}
              className={cn(
                "flex-1 min-w-0 justify-between h-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20",
                errors?.address?.city && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                selectedCommuneId && !errors?.address?.city && "border-[#CBB171] bg-[#CBB171]/5"
              )}
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <MapPin className="w-4 h-4 text-[#CBB171] flex-shrink-0" />
                <span className={cn(
                  "truncate text-sm",
                  !selectedCommuneId && "text-muted-foreground"
                )}>
                  {!selectedProvinceId 
                    ? "Sélectionnez d'abord une province..." 
                    : isLoading
                    ? "Chargement..."
                    : selectedCommune?.name || "Sélectionnez une ville..."}
                </span>
              </div>
              {isLoading ? (
                <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
              ) : (
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput 
                placeholder="Rechercher une ville..." 
                className="h-9"
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                {isLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                  </div>
                ) : !selectedProvinceId ? (
                  <CommandEmpty>
                    <div className="p-4 text-center text-sm text-gray-500">
                      Sélectionnez d'abord une province
                    </div>
                  </CommandEmpty>
                ) : filteredCommunes.length === 0 ? (
                  <CommandEmpty>
                    <div className="p-4 text-center text-sm text-gray-500">
                      {searchQuery ? `Aucun résultat pour "${searchQuery}"` : "Aucune ville disponible."}
                    </div>
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {filteredCommunes.map((commune) => (
                      <CommandItem
                        key={commune.id}
                        value={commune.name}
                        onSelect={handleSelect}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCommuneId === commune.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex items-center space-x-2 flex-1">
                          <MapPin className="w-4 h-4 text-[#224D62] flex-shrink-0" />
                          <span className="text-sm">{commune.name}</span>
                          {commune.postalCode && (
                            <span className="text-xs text-gray-500 ml-auto">
                              {commune.postalCode}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {onAddNew && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onAddNew}
            className="h-10 w-10 flex-shrink-0"
            title="Ajouter une nouvelle commune"
            disabled={isDisabled || !selectedProvinceId}
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {errors?.address?.city && (
        <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
          <AlertCircle className="w-3 h-3" />
          <span>{errors.address.city.message}</span>
        </div>
      )}
    </div>
  )
}
