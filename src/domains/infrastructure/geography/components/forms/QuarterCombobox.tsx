'use client'

import React, { useState, useMemo } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { RegisterFormData } from '@/schemas/schemas'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useQuarterSearch } from '../../hooks/useQuarterSearch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Check, ChevronsUpDown, Loader2, MapPin, AlertCircle, Plus, Lock } from 'lucide-react'
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
  const { watch, setValue, formState: { errors } } = form
  
  const selectedQuarterId = watch('address.quarterId') || ''
  const selectedDistrictId = districtId || watch('address.districtId') || ''

  // Chargement initial : Quartiers de l'arrondissement sélectionné (approche hybride)
  const { data: initialQuarters = [], isLoading: isLoadingInitial } = useQuery({
    queryKey: ['quarters', selectedDistrictId],
    queryFn: () => ServiceFactory.getGeographieService().getQuartersByDistrictId(selectedDistrictId),
    enabled: !!selectedDistrictId,
    staleTime: 5 * 60 * 1000,
  })

  const sortedInitialQuarters = useMemo(
    () =>
      [...initialQuarters].sort((a, b) =>
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      ),
    [initialQuarters]
  )

  // Recherche : Pour filtrer quand l'utilisateur tape (optionnel)
  const {
    searchTerm,
    setSearchTerm,
    quarters: searchResults,
    isLoading: isLoadingSearch,
  } = useQuarterSearch({
    districtId: selectedDistrictId || undefined,
    debounceDelay: 300,
    limit: 50,
  })

  const isLoading = isLoadingSearch || isLoadingInitial

  // Quarters à afficher : initiales si pas de recherche, sinon résultats de recherche
  const filteredQuarters = useMemo(() => {
    if (searchTerm.trim().length >= 2) {
      return searchResults
    }
    return sortedInitialQuarters
  }, [searchTerm, searchResults, sortedInitialQuarters])

  // Trouver le quartier sélectionné (dans filteredQuarters ou initialQuarters)
  const selectedQuarter = useMemo(() => {
    const found = filteredQuarters.find((q) => q.id === selectedQuarterId)
    if (found) return found
    const foundInInitial = sortedInitialQuarters.find((q) => q.id === selectedQuarterId)
    if (foundInInitial) return foundInInitial
    return undefined
  }, [filteredQuarters, sortedInitialQuarters, selectedQuarterId])

  const handleSelect = (value: string) => {
    // cmdk passe la valeur du prop 'value' (quarter.name), on doit trouver l'ID correspondant
    const quarter = filteredQuarters.find(q => q.name.toLowerCase() === value.toLowerCase())
    if (!quarter) return
    
    // Sélectionner le quartier (sans toggle pour éviter les bugs de double-clic)
    setValue('address.quarterId', quarter.id, { shouldValidate: true })
    // Mettre à jour le champ texte
    setValue('address.district', quarter.name, { shouldValidate: true })
    setOpen(false)
    setSearchTerm('')
  }

  const isDisabled = disabled || !selectedDistrictId || isLoading

  return (
    <div className="space-y-2 w-full" data-testid="step2-address-quarter-container">
      <Label htmlFor="quarter" className="text-xs sm:text-sm font-medium text-[#224D62]" data-testid="step2-address-quarter-label">
        Quartier <span className="text-red-500">*</span>
      </Label>
      
      <div className="flex items-center gap-2 w-full min-w-0">
        <Popover open={open} onOpenChange={setOpen} data-testid="step2-address-quarter-combobox">
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
              data-testid="step2-address-quarter-trigger"
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {!selectedDistrictId ? (
                  <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <MapPin className="w-4 h-4 text-[#CBB171] flex-shrink-0" />
                )}
                <span className={cn(
                  "truncate text-sm",
                  !selectedQuarterId && "text-muted-foreground"
                )}>
                  {!selectedDistrictId 
                    ? "Sélectionnez d'abord un arrondissement..." 
                    : selectedQuarter?.name || watch('address.district') || "Sélectionnez un quartier"}
                </span>
              </div>
              {isLoading ? (
                <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
              ) : (
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[var(--radix-popover-trigger-width)] p-0" 
            align="start"
            data-testid="step2-address-quarter-popover"
          >
            <Command shouldFilter={false}>
              <CommandInput 
                placeholder="Rechercher ou parcourir les quartiers..." 
                className="h-9"
                value={searchTerm}
                onValueChange={setSearchTerm}
                data-testid="step2-address-quarter-search-input"
              />
              <CommandList data-testid="step2-address-quarter-results">
                {isLoading ? (
                  <div className="flex items-center justify-center p-4" data-testid="step2-address-quarter-loading">
                    <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                  </div>
                ) : !selectedDistrictId ? (
                  <CommandEmpty>
                    <div className="p-4 text-center text-sm text-gray-500" data-testid="step2-address-quarter-locked-message">
                      Sélectionnez d'abord un arrondissement
                    </div>
                  </CommandEmpty>
                ) : filteredQuarters.length === 0 ? (
                  <CommandEmpty data-testid="step2-address-quarter-no-results">
                    <div className="p-4 text-center text-sm text-gray-500">
                      {searchTerm ? `Aucun résultat pour "${searchTerm}"` : "Aucun quartier trouvé."}
                    </div>
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {filteredQuarters.map((quarter) => (
                      <CommandItem
                        key={quarter.id}
                        value={quarter.name}
                        onSelect={handleSelect}
                        data-testid={`step2-address-quarter-result-item-${quarter.id}`}
                        className={cn(
                          selectedQuarterId === quarter.id && "bg-[#CBB171]/5"
                        )}
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
            data-testid="step2-address-quarter-add-button"
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
