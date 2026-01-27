'use client'

import React, { useState, useMemo } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { RegisterFormData } from '@/schemas/schemas'
import { useDepartments } from '../../hooks/useGeographie'
import { useCommuneSearch } from '../../hooks/useCommuneSearch'
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
import type { Commune } from '../../entities/geography.types'

interface CommuneComboboxProps {
  form: UseFormReturn<RegisterFormData>
  provinceId?: string
  onAddNew?: () => void // Callback pour ouvrir le modal d'ajout
  disabled?: boolean
}

export default function CommuneCombobox({ form, provinceId, onAddNew, disabled = false }: CommuneComboboxProps) {
  const [open, setOpen] = useState(false)
  const { watch, setValue, formState: { errors } } = form
  
  const selectedCommuneId = watch('address.communeId') || ''
  const selectedProvinceId = provinceId || watch('address.provinceId') || ''
  
  // Charger les départements de la province sélectionnée
  const { data: departments = [], isLoading: isLoadingDepartments } = useDepartments(
    selectedProvinceId || undefined
  )

  // **IMPORTANT** : Recherche uniquement (pas de chargement complet)
  // Stratégie : min 2 chars, debounce 300ms, limit 50, cache 5 min
  const departmentIds = useMemo(() => departments.map(d => d.id), [departments])
  const { 
    searchTerm, 
    setSearchTerm, 
    communes: searchResults, 
    isLoading: isLoadingSearch 
  } = useCommuneSearch({
    departmentIds,
    debounceDelay: 300,
    limit: 50,
  })

  const isLoading = isLoadingSearch || isLoadingDepartments
  
  // Trouver la commune sélectionnée dans les résultats de recherche
  // Si elle n'est pas dans les résultats (car pas recherchée), on peut la charger individuellement
  const selectedCommune = useMemo(() => {
    // D'abord chercher dans les résultats de recherche
    const foundInResults = searchResults.find(c => c.id === selectedCommuneId)
    if (foundInResults) return foundInResults
    
    // Si pas trouvée et qu'on a un ID, on retourne undefined
    // (la commune sera affichée via le nom stocké dans le formulaire)
    return undefined
  }, [searchResults, selectedCommuneId])

  // Communes à afficher : résultats de recherche
  const filteredCommunes = searchResults

  const handleSelect = (value: string) => {
    // cmdk passe la valeur du prop 'value' (commune.name), on doit trouver l'ID correspondant
    const commune = filteredCommunes.find(c => c.name.toLowerCase() === value.toLowerCase())
    if (!commune) return
    
    // Sélectionner la commune (sans toggle pour éviter les bugs de double-clic)
    setValue('address.communeId', commune.id, { shouldValidate: true })
    // Mettre à jour le champ texte
    setValue('address.city', commune.name, { shouldValidate: true })
    // Réinitialiser les sélections en cascade
    setValue('address.districtId', '', { shouldValidate: true })
    setValue('address.quarterId', '', { shouldValidate: true })
    setValue('address.arrondissement', '', { shouldValidate: true })
    setValue('address.district', '', { shouldValidate: true })
    setOpen(false)
    setSearchTerm('')
  }

  const isDisabled = disabled || !selectedProvinceId || isLoading

  return (
    <div className="space-y-2 w-full">
      <Label htmlFor="city" className="text-xs sm:text-sm font-medium text-[#224D62]">
        Ville <span className="text-red-500">*</span>
      </Label>
      
      <div className="flex items-center gap-2 w-full min-w-0" data-testid="step2-address-commune-container">
        <div data-testid="step2-address-commune-combobox" className="flex-1">
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
              data-testid="step2-address-commune-trigger"
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {!selectedProvinceId ? (
                  <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <MapPin className="w-4 h-4 text-[#CBB171] flex-shrink-0" />
                )}
                <span className={cn(
                  "truncate text-sm",
                  !selectedCommuneId && "text-muted-foreground"
                )}>
                  {!selectedProvinceId 
                    ? "Sélectionnez d'abord une province..." 
                    : selectedCommune?.name || watch('address.city') || "Rechercher une ville (min 2 caractères)..."}
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
            data-testid="step2-address-commune-popover"
          >
            <Command shouldFilter={false}>
              <CommandInput 
                placeholder="Rechercher une ville (min 2 caractères)..." 
                className="h-9"
                value={searchTerm}
                onValueChange={setSearchTerm}
                data-testid="step2-address-commune-search-input"
              />
              <CommandList data-testid="step2-address-commune-results">
                {isLoading ? (
                  <div className="flex items-center justify-center p-4" data-testid="step2-address-commune-loading">
                    <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                  </div>
                ) : !selectedProvinceId ? (
                  <CommandEmpty>
                    <div className="p-4 text-center text-sm text-gray-500" data-testid="step2-address-commune-locked-message">
                      Sélectionnez d'abord une province
                    </div>
                  </CommandEmpty>
                ) : searchTerm.trim().length < 2 ? (
                  <CommandEmpty>
                    <div className="p-4 text-center text-sm text-gray-500">
                      Tapez au moins 2 caractères pour rechercher...
                    </div>
                  </CommandEmpty>
                ) : filteredCommunes.length === 0 ? (
                  <CommandEmpty data-testid="step2-address-commune-no-results">
                    <div className="p-4 text-center text-sm text-gray-500">
                      {searchTerm ? `Aucun résultat pour "${searchTerm}"` : "Aucune ville trouvée."}
                    </div>
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {filteredCommunes.map((commune) => (
                      <CommandItem
                        key={commune.id}
                        value={commune.name}
                        onSelect={handleSelect}
                        data-testid={`step2-address-commune-result-item-${commune.id}`}
                        className={cn(
                          selectedCommuneId === commune.id && "bg-[#CBB171]/5"
                        )}
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
        </div>
        
        {onAddNew && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onAddNew}
            className="h-10 w-10 flex-shrink-0"
            title="Ajouter une nouvelle commune"
            disabled={isDisabled || !selectedProvinceId}
            data-testid="step2-address-commune-add-button"
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
