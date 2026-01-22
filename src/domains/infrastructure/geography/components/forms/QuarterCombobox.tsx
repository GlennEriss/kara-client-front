'use client'

import React, { useState, useMemo } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { RegisterFormData } from '@/schemas/schemas'
import { useQuarters } from '../../hooks/useGeographie'
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
import type { Quarter } from '../../entities/geography.types'

interface QuarterComboboxProps {
  form: UseFormReturn<RegisterFormData>
  districtId?: string
  onAddNew?: () => void // Callback pour ouvrir le modal d'ajout
  disabled?: boolean
}

export default function QuarterCombobox({ form, districtId, onAddNew, disabled = false }: QuarterComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { watch, setValue, formState: { errors } } = form
  
  const selectedQuarterId = watch('address.quarterId') || ''
  const selectedDistrictId = districtId || watch('address.districtId') || ''
  
  // Charger les quartiers (quarters) de l'arrondissement sélectionné
  const { data: quarters = [], isLoading } = useQuarters(
    selectedDistrictId || undefined
  )

  // Trier et filtrer les quarters
  const filteredQuarters = useMemo(() => {
    const sorted = [...quarters].sort((a, b) => 
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
    if (!searchQuery.trim()) return sorted
    const query = searchQuery.toLowerCase()
    return sorted.filter(quarter => 
      quarter.name.toLowerCase().includes(query)
    )
  }, [quarters, searchQuery])

  const selectedQuarter = filteredQuarters.find(q => q.id === selectedQuarterId)

  const handleSelect = (value: string) => {
    // cmdk passe la valeur du prop 'value' (quarter.name), on doit trouver l'ID correspondant
    const quarter = filteredQuarters.find(q => q.name.toLowerCase() === value.toLowerCase())
    if (!quarter) return
    
    // Sélectionner le quartier (sans toggle pour éviter les bugs de double-clic)
    setValue('address.quarterId', quarter.id, { shouldValidate: true })
    setOpen(false)
    setSearchQuery('')
  }

  const isDisabled = disabled || !selectedDistrictId || isLoading

  return (
    <div className="space-y-2 w-full">
      <Label htmlFor="quarter" className="text-xs sm:text-sm font-medium text-[#224D62]">
        Quartier <span className="text-red-500">*</span>
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
                errors?.address?.district && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                selectedQuarterId && !errors?.address?.district && "border-[#CBB171] bg-[#CBB171]/5"
              )}
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <MapPin className="w-4 h-4 text-[#CBB171] flex-shrink-0" />
                <span className={cn(
                  "truncate text-sm",
                  !selectedQuarterId && "text-muted-foreground"
                )}>
                  {!selectedDistrictId 
                    ? "Sélectionnez d'abord un arrondissement..." 
                    : isLoading
                    ? "Chargement..."
                    : selectedQuarter?.name || "Sélectionnez un quartier..."}
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
                placeholder="Rechercher un quartier..." 
                className="h-9"
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                {isLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                  </div>
                ) : !selectedDistrictId ? (
                  <CommandEmpty>
                    <div className="p-4 text-center text-sm text-gray-500">
                      Sélectionnez d'abord un arrondissement
                    </div>
                  </CommandEmpty>
                ) : filteredQuarters.length === 0 ? (
                  <CommandEmpty>
                    <div className="p-4 text-center text-sm text-gray-500">
                      {searchQuery ? `Aucun résultat pour "${searchQuery}"` : "Aucun quartier disponible."}
                    </div>
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {filteredQuarters.map((quarter) => (
                      <CommandItem
                        key={quarter.id}
                        value={quarter.name}
                        onSelect={handleSelect}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedQuarterId === quarter.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex items-center space-x-2 flex-1">
                          <MapPin className="w-4 h-4 text-[#224D62] flex-shrink-0" />
                          <span className="text-sm">{quarter.name}</span>
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
            title="Ajouter un nouveau quartier"
            disabled={isDisabled || !selectedDistrictId}
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {errors?.address?.district && (
        <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
          <AlertCircle className="w-3 h-3" />
          <span>{errors.address.district.message}</span>
        </div>
      )}
    </div>
  )
}
