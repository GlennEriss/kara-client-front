'use client'

import React, { useState, useMemo } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { RegisterFormData } from '@/schemas/schemas'
import { useDistricts } from '../../hooks/useGeographie'
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
import type { District } from '../../entities/geography.types'

interface DistrictComboboxProps {
  form: UseFormReturn<RegisterFormData>
  communeId?: string
  onAddNew?: () => void // Callback pour ouvrir le modal d'ajout
  disabled?: boolean
}

export default function DistrictCombobox({ form, communeId, onAddNew, disabled = false }: DistrictComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { watch, setValue, formState: { errors } } = form
  
  const selectedDistrictId = watch('address.districtId') || ''
  const selectedCommuneId = communeId || watch('address.communeId') || ''
  
  // Charger les arrondissements (districts) de la commune sélectionnée
  const { data: districts = [], isLoading } = useDistricts(
    selectedCommuneId || undefined
  )

  // Trier et filtrer les districts
  const filteredDistricts = useMemo(() => {
    const sorted = [...districts].sort((a, b) => 
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
    if (!searchQuery.trim()) return sorted
    const query = searchQuery.toLowerCase()
    return sorted.filter(district => 
      district.name.toLowerCase().includes(query)
    )
  }, [districts, searchQuery])

  const selectedDistrict = filteredDistricts.find(d => d.id === selectedDistrictId)

  const handleSelect = (value: string) => {
    // cmdk passe la valeur du prop 'value' (district.id), on trouve par ID pour éviter les problèmes de caractères spéciaux
    const district = filteredDistricts.find(d => d.id === value) ??
      filteredDistricts.find(d => d.name.toLowerCase() === value.toLowerCase())
    if (!district) return
    
    // Sélectionner l'arrondissement (sans toggle pour éviter les bugs de double-clic)
    setValue('address.districtId', district.id, { shouldValidate: true })
    // Réinitialiser les sélections en cascade
    setValue('address.quarterId', '', { shouldValidate: true })
    setOpen(false)
    setSearchQuery('')
  }

  const isDisabled = disabled || !selectedCommuneId || isLoading

  return (
    <div className="space-y-2 w-full">
      <Label htmlFor="arrondissement" className="text-xs sm:text-sm font-medium text-[#224D62]">
        Arrondissement <span className="text-red-500">*</span>
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
                errors?.address?.arrondissement && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                selectedDistrictId && !errors?.address?.arrondissement && "border-[#CBB171] bg-[#CBB171]/5"
              )}
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <MapPin className="w-4 h-4 text-[#CBB171] flex-shrink-0" />
                <span className={cn(
                  "truncate text-sm",
                  !selectedDistrictId && "text-muted-foreground"
                )}>
                  {!selectedCommuneId 
                    ? "Sélectionnez d'abord une ville..." 
                    : isLoading
                    ? "Chargement..."
                    : selectedDistrict?.name || "Sélectionnez un arrondissement..."}
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
                placeholder="Rechercher un arrondissement..." 
                className="h-9"
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                {isLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                  </div>
                ) : !selectedCommuneId ? (
                  <CommandEmpty>
                    <div className="p-4 text-center text-sm text-gray-500">
                      Sélectionnez d'abord une ville
                    </div>
                  </CommandEmpty>
                ) : filteredDistricts.length === 0 ? (
                  <CommandEmpty>
                    <div className="p-4 text-center text-sm text-gray-500">
                      {searchQuery ? `Aucun résultat pour "${searchQuery}"` : "Aucun arrondissement disponible."}
                    </div>
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {filteredDistricts.map((district) => (
                      <CommandItem
                        key={district.id}
                        value={district.id}
                        keywords={[district.name]}
                        onSelect={handleSelect}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedDistrictId === district.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex items-center space-x-2 flex-1">
                          <MapPin className="w-4 h-4 text-[#224D62] flex-shrink-0" />
                          <span className="text-sm">{district.name}</span>
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
            title="Ajouter un nouvel arrondissement"
            disabled={isDisabled || !selectedCommuneId}
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {errors?.address?.arrondissement && (
        <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
          <AlertCircle className="w-3 h-3" />
          <span>{errors.address.arrondissement.message}</span>
        </div>
      )}
    </div>
  )
}
