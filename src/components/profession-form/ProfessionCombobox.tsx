'use client'

import React, { useState, useMemo } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { RegisterFormData } from '@/schemas/schemas'
import { useProfessions } from '@/hooks/useProfessions'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Check, ChevronsUpDown, Loader2, GraduationCap, AlertCircle, Plus } from 'lucide-react'
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

interface ProfessionComboboxProps {
  form: UseFormReturn<RegisterFormData>
  onAddNew?: () => void // Callback pour ouvrir le modal d'ajout
}

export default function ProfessionCombobox({ form, onAddNew }: ProfessionComboboxProps) {
  const [open, setOpen] = useState(false)
  const { professions, isLoading, error } = useProfessions()
  const { watch, setValue, formState: { errors } } = form
  
  const selectedProfessionName = watch('company.profession') || ''
  
  // Trier les professions par ordre alphabétique
  const sortedProfessions = useMemo(() => {
    return [...professions].sort((a, b) => 
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
  }, [professions])

  const handleSelect = (professionName: string) => {
    setValue('company.profession', professionName === selectedProfessionName ? '' : professionName, { shouldValidate: true })
    setOpen(false)
  }

  return (
    <div className="space-y-2 w-full">
      <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
        Profession <span className="text-red-500">*</span>
      </Label>
      
      <div className="flex items-center gap-2 w-full min-w-0">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "flex-1 min-w-0 justify-between h-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20",
                errors?.company?.profession && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                selectedProfessionName && !errors?.company?.profession && "border-[#CBB171] bg-[#CBB171]/5"
              )}
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <GraduationCap className="w-4 h-4 text-[#CBB171] flex-shrink-0" />
                <span className={cn(
                  "truncate text-sm",
                  !selectedProfessionName && "text-muted-foreground"
                )}>
                  {selectedProfessionName || "Sélectionnez une profession..."}
                </span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Rechercher une profession..." 
                className="h-9"
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
                      <span className="text-sm">{error}</span>
                    </div>
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {sortedProfessions.length === 0 ? (
                      <CommandEmpty>
                        <div className="p-4 text-center text-sm text-gray-500">
                          Aucune profession disponible.
                        </div>
                      </CommandEmpty>
                    ) : (
                      sortedProfessions.map((profession) => (
                        <CommandItem
                          key={profession.id}
                          value={profession.name}
                          onSelect={() => handleSelect(profession.name)}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedProfessionName === profession.name
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex items-center space-x-2 flex-1">
                            <GraduationCap className="w-4 h-4 text-[#224D62] flex-shrink-0" />
                            <span className="text-sm">{profession.name}</span>
                            {profession.category && (
                              <span className="text-xs text-gray-500 ml-auto">
                                {profession.category}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))
                    )}
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
            title="Ajouter une nouvelle profession"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {errors?.company?.profession && (
        <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
          <AlertCircle className="w-3 h-3" />
          <span>{errors.company.profession.message}</span>
        </div>
      )}
    </div>
  )
}

