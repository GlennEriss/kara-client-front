/**
 * Composant de recherche avec autocomplétion pour le code entremetteur
 * 
 * Remplace le champ texte simple par un Combobox qui permet de rechercher
 * un membre par nom/prénom et sélectionner automatiquement son code entremetteur.
 * 
 * Utilise Algolia pour la recherche en temps réel avec cache React Query.
 * 
 * @see ui/README.md pour les spécifications UI complètes
 * @see cache-strategy.md pour la stratégie de cache
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { RegisterFormData } from '@/schemas/schemas'
import { useIntermediaryCodeSearch } from '../../hooks/useIntermediaryCodeSearch'
import { getMembersAlgoliaSearchService } from '@/services/search/MembersAlgoliaSearchService'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { 
  Hash, 
  CheckCircle, 
  ChevronsUpDown, 
  Loader2, 
  AlertCircle, 
  Info,
  X
} from 'lucide-react'
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
import type { IntermediarySearchResult } from '../../hooks/useIntermediaryCodeSearch'

export default function IntermediaryCodeSearch() {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  
  const { watch, setValue, formState: { errors } } = useFormContext<RegisterFormData>()
  const selectedCode = watch('identity.intermediaryCode') || ''
  
  // Vérifier si Algolia est disponible (memoized pour éviter les recalculs)
  const searchService = useMemo(() => getMembersAlgoliaSearchService(), [])
  const isAlgoliaAvailable = useMemo(() => searchService.isAvailable(), [searchService])

  // Debounce de 200ms pour une meilleure réactivité tout en évitant les recherches multiples
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 200)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Recherche via Algolia
  const { results, isLoading, isError, error } = useIntermediaryCodeSearch({
    query: debouncedQuery,
    enabled: isAlgoliaAvailable && debouncedQuery.trim().length >= 2,
  })

  // Trouver le membre sélectionné pour l'affichage
  const selectedMember = useMemo(() => {
    if (!selectedCode) return null
    return results.find((r) => r.code === selectedCode) || null
  }, [selectedCode, results])

  // Gérer la sélection d'un membre (memoized pour éviter les re-renders)
  const handleSelect = useCallback((result: IntermediarySearchResult) => {
    setValue('identity.intermediaryCode', result.code, { shouldValidate: true })
    setOpen(false)
    setSearchQuery('')
    setDebouncedQuery('')
  }, [setValue])

  // Gérer l'effacement de la sélection (memoized)
  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setValue('identity.intermediaryCode', '', { shouldValidate: true })
    setSearchQuery('')
    setDebouncedQuery('')
  }, [setValue])

  // Vérifier si le code est valide (format XXXX.MK.XXXX)
  const isValidCode = selectedCode && /^\d+\.MK\.\d+$/.test(selectedCode)
  const hasError = !!errors?.identity?.intermediaryCode

  return (
    <div 
      data-testid="intermediary-code-search-container"
      className="space-y-2 w-full"
    >
      <Label 
        className="text-xs sm:text-sm font-semibold text-kara-primary-dark flex items-center gap-2"
      >
        <Hash 
          data-testid="intermediary-code-search-icon"
          className="w-4 h-4 text-rose-600" 
        />
        Qui vous a référé? <span className="text-red-500">*</span>
      </Label>
      
      <div className="relative">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-controls="intermediary-code-search-results"
              aria-haspopup="listbox"
              className={cn(
                "w-full h-12 rounded-xl border-2 justify-between px-4 py-3 text-sm font-mono tracking-wider transition-all duration-200",
                // Supprimer complètement le focus ring par défaut du Button shadcn/ui
                "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-ring/0",
                "focus:outline-none focus:ring-0 focus:ring-offset-0",
                // États de bordure
                !hasError && !selectedCode && "border-rose-200 hover:border-rose-400",
                !hasError && selectedCode && isValidCode && "border-kara-primary-light bg-kara-primary-light/5",
                hasError && "border-red-500",
                "bg-white",
                // Ajouter padding-right si bouton clear présent
                selectedCode && "pr-10"
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Hash className="w-4 h-4 text-rose-600 shrink-0" />
                <span className={cn(
                  "truncate text-sm",
                  !selectedCode && "text-gray-400"
                )}>
                  {selectedCode || "Rechercher par nom ou prénom..."}
                </span>
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0">
                {selectedCode && isValidCode && (
                  <CheckCircle
                    data-testid="intermediary-code-search-check-icon"
                    className="w-5 h-5 text-green-500 animate-in zoom-in-50 duration-200"
                  />
                )}
                <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
              </div>
            </Button>
          </PopoverTrigger>
          
          {/* Bouton clear en dehors du PopoverTrigger pour éviter le nesting */}
          {selectedCode && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-10 top-1/2 transform -translate-y-1/2 h-6 w-6 hover:bg-gray-100 z-10"
              onClick={handleClear}
              data-testid="intermediary-code-search-clear"
            >
              <X className="w-3 h-3 text-gray-400" />
            </Button>
          )}
          
          <PopoverContent 
            data-testid="intermediary-code-search-results"
            className="w-[var(--radix-popover-trigger-width)] p-0 mt-1 shadow-lg border border-gray-200 rounded-lg bg-white animate-in fade-in-0 slide-in-from-top-2 duration-200"
            align="start"
          >
            <Command shouldFilter={false}>
              <CommandInput 
                placeholder="Rechercher par nom ou prénom..." 
                className="h-9 focus-visible:outline-none focus-visible:ring-0 focus:outline-none focus:ring-0"
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                {isLoading ? (
                  <div 
                    data-testid="intermediary-code-search-loading"
                    className="flex items-center justify-center p-4"
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                    <span className="ml-2 text-sm text-gray-500">Recherche en cours...</span>
                  </div>
                ) : isError ? (
                  <CommandEmpty>
                    <div className="flex flex-col items-center space-y-2 text-red-500 p-4">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {error?.message || 'Erreur lors de la recherche'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 text-center">
                        Le service de recherche est temporairement indisponible. Veuillez réessayer dans quelques instants.
                      </p>
                    </div>
                  </CommandEmpty>
                ) : !isAlgoliaAvailable ? (
                  <div className="p-4 text-center text-sm text-amber-600">
                    <AlertCircle className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                    <p className="font-medium">Service de recherche non disponible</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Veuillez contacter l'administrateur pour configurer le service de recherche.
                    </p>
                  </div>
                ) : results.length === 0 && debouncedQuery.trim().length >= 2 ? (
                  <div 
                    data-testid="intermediary-code-search-empty"
                    className="p-4 text-center text-sm text-gray-500"
                  >
                    <Info className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                    Aucun résultat pour "{debouncedQuery}"
                  </div>
                ) : results.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    Tapez au moins 2 caractères pour rechercher
                  </div>
                ) : (
                  <CommandGroup>
                    {results.slice(0, 10).map((result) => (
                      <CommandItem
                        key={result.member.id}
                        data-testid={`intermediary-code-search-option-${result.code}`}
                        value={result.displayName}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer transition-colors duration-150"
                      >
                        <CheckCircle
                          className={cn(
                            "w-4 h-4 mr-2 shrink-0",
                            selectedCode === result.code
                              ? "opacity-100 text-green-500"
                              : "opacity-0"
                          )}
                        />
                        <span className="text-sm text-gray-900 font-medium flex-1 truncate">
                          {result.displayName}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Message hint */}
      {!selectedCode && searchQuery.trim().length < 2 && (
        <p 
          data-testid="intermediary-code-search-hint"
          className="text-xs text-gray-400 mt-1 flex items-center gap-1"
        >
          <Info className="w-3 h-3" />
          Tapez au moins 2 caractères
        </p>
      )}

      {/* Message de validation */}
      {selectedCode && isValidCode && !hasError && (
        <div
          data-testid="intermediary-code-search-validated"
          className="flex items-center gap-1 mt-1 animate-in slide-in-from-bottom-2 duration-300"
        >
          <CheckCircle className="w-3 h-3 text-green-500" />
          <span className="text-xs text-green-600">Format valide</span>
        </div>
      )}

      {/* Message d'erreur */}
      {hasError && (
        <div
          data-testid="intermediary-code-search-error"
          className="flex items-center gap-1 text-xs text-red-500 mt-1 animate-in slide-in-from-left-2 duration-300"
        >
          <AlertCircle className="w-3 h-3" />
          <span>{errors.identity?.intermediaryCode?.message}</span>
        </div>
      )}
    </div>
  )
}
