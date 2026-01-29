'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { RegisterFormData } from '@/schemas/schemas'
import { useProvinces } from '../../hooks/useGeographie'
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
import type { Province } from '../../entities/geography.types'

interface ProvinceComboboxProps {
  form: UseFormReturn<RegisterFormData>
  onAddNew?: () => void // Callback pour ouvrir le modal d'ajout
  disabled?: boolean
}

export default function ProvinceCombobox({ form, onAddNew, disabled = false }: ProvinceComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { data: provinces = [], isLoading, error } = useProvinces()
  const { watch, setValue, formState: { errors } } = form
  
  const selectedProvinceId = watch('address.provinceId') || ''
  
  // Trier et filtrer les provinces
  const filteredProvinces = useMemo(() => {
    const sorted = [...provinces].sort((a, b) => 
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
    if (!searchQuery.trim()) return sorted
    const query = searchQuery.toLowerCase()
    return sorted.filter(province => 
      province.name.toLowerCase().includes(query) ||
      province.code.toLowerCase().includes(query)
    )
  }, [provinces, searchQuery])

  const selectedProvince = filteredProvinces.find(p => p.id === selectedProvinceId)

  const handleSelect = useCallback((value: string) => {
    // cmdk passe la valeur du prop 'value'
    // On utilise province.id pour éviter les problèmes d'accents (ex: OGOOUÉ-MARITIME)
    const province = filteredProvinces.find(p => p.id === value) ??
      filteredProvinces.find(p => p.name.toLowerCase() === value.toLowerCase())
    if (!province) {
      console.warn('Province not found for value:', value)
      return
    }

    // Sélectionner la province (sans toggle pour éviter les bugs de double-clic)
    setValue('address.provinceId', province.id, { shouldValidate: true })
    // Réinitialiser les sélections en cascade
    setValue('address.communeId', '', { shouldValidate: true })
    setValue('address.districtId', '', { shouldValidate: true })
    setValue('address.quarterId', '', { shouldValidate: true })
    setOpen(false)
    setSearchQuery('')
  }, [filteredProvinces, setValue])

  return (
    <div className="space-y-2 w-full">
      <Label htmlFor="province" className="text-xs sm:text-sm font-medium text-[#224D62]">
        Province <span className="text-red-500">*</span>
      </Label>
      
      <div className="flex items-center gap-2 w-full min-w-0">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled || isLoading}
              className={cn(
                "flex-1 min-w-0 justify-between h-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20",
                errors?.address?.province && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                selectedProvinceId && !errors?.address?.province && "border-[#CBB171] bg-[#CBB171]/5"
              )}
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <MapPin className="w-4 h-4 text-[#CBB171] flex-shrink-0" />
                <span className={cn(
                  "truncate text-sm",
                  !selectedProvinceId && "text-muted-foreground"
                )}>
                  {selectedProvince?.name || "Sélectionnez une province..."}
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
                placeholder="Rechercher une province..." 
                className="h-9"
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                {isLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                  </div>
                ) : error ? (
                  <CommandEmpty>
                    <div className="flex items-center space-x-2 text-red-500 p-4">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{error?.message || 'Erreur lors du chargement'}</span>
                    </div>
                  </CommandEmpty>
                ) : filteredProvinces.length === 0 ? (
                  <CommandEmpty>
                    <div className="p-4 text-center text-sm text-gray-500">
                      {searchQuery ? `Aucun résultat pour "${searchQuery}"` : "Aucune province disponible."}
                    </div>
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {filteredProvinces.map((province) => (
                      <CommandItem
                        key={province.id}
                        value={province.id}
                        onSelect={handleSelect}
                        keywords={[province.name, province.code]}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedProvinceId === province.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex items-center space-x-2 flex-1">
                          <MapPin className="w-4 h-4 text-[#224D62] flex-shrink-0" />
                          <span className="text-sm">{province.name}</span>
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
            title="Ajouter une nouvelle province"
            disabled={disabled}
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {errors?.address?.province && (
        <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
          <AlertCircle className="w-3 h-3" />
          <span>{errors.address.province.message}</span>
        </div>
      )}
    </div>
  )
}
