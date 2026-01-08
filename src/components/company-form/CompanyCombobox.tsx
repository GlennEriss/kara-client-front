'use client'

import React, { useState, useMemo } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { RegisterFormData } from '@/schemas/schemas'
import { useCompanies } from '@/hooks/useCompanies'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Check, ChevronsUpDown, Loader2, Building2, AlertCircle, Plus } from 'lucide-react'
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
import type { Company } from '@/types/types'

interface CompanyComboboxProps {
  form: UseFormReturn<RegisterFormData>
  onAddNew?: () => void // Callback pour ouvrir le modal d'ajout
}

export default function CompanyCombobox({ form, onAddNew }: CompanyComboboxProps) {
  const [open, setOpen] = useState(false)
  const { companies, isLoading, error } = useCompanies()
  const { watch, setValue, formState: { errors } } = form
  
  const selectedCompanyName = watch('company.companyName') || ''
  
  // Trier les entreprises par ordre alphabétique
  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [companies])

  const handleSelect = (companyName: string) => {
    setValue('company.companyName', companyName === selectedCompanyName ? '' : companyName, { shouldValidate: true })
    setOpen(false)
  }

  return (
    <div className="space-y-2 w-full">
      <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
        Nom de l'entreprise <span className="text-red-500">*</span>
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
              errors?.company?.companyName && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              selectedCompanyName && !errors?.company?.companyName && "border-[#CBB171] bg-[#CBB171]/5"
            )}
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <Building2 className="w-4 h-4 text-[#CBB171] flex-shrink-0" />
              <span className={cn(
                "truncate text-sm",
                !selectedCompanyName && "text-muted-foreground"
              )}>
                {selectedCompanyName || "Sélectionnez une entreprise..."}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Rechercher une entreprise..." 
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
                  {sortedCompanies.length === 0 ? (
                    <CommandEmpty>
                      <div className="p-4 text-center text-sm text-gray-500">
                        Aucune entreprise disponible.
                      </div>
                    </CommandEmpty>
                  ) : (
                    sortedCompanies.map((company) => (
                      <CommandItem
                        key={company.id}
                        value={company.name}
                        onSelect={() => handleSelect(company.name)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCompanyName === company.name
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex items-center space-x-2 flex-1">
                          <Building2 className="w-4 h-4 text-[#224D62] flex-shrink-0" />
                          <span className="text-sm">{company.name}</span>
                          {company.industry && (
                            <span className="text-xs text-gray-500 ml-auto">
                              {company.industry}
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
          title="Ajouter une nouvelle entreprise"
        >
          <Plus className="w-4 h-4" />
        </Button>
      )}
      </div>
      
      {errors?.company?.companyName && (
        <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
          <AlertCircle className="w-3 h-3" />
          <span>{errors.company.companyName.message}</span>
        </div>
      )}
    </div>
  )
}

