/**
 * Composant de recherche Algolia pour les anniversaires
 * 
 * Permet de rechercher un membre par nom, prénom ou matricule.
 * Quand un résultat est sélectionné, navigue automatiquement vers le mois d'anniversaire.
 */

'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useBirthdaySearch } from '../../hooks/useBirthdaySearch'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export interface BirthdaysSearchProps {
  onSelectMember?: (memberId: string, birthMonth: number) => void
  placeholder?: string
}

export function BirthdaysSearch({
  onSelectMember,
  placeholder = 'Nom, prénom ou matricule',
}: BirthdaysSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)

  const { hits, isLoading, isError, error } = useBirthdaySearch({
    query: searchQuery,
    enabled: searchQuery.length >= 2,
  })

  // Fermer le popover quand un membre est sélectionné
  const handleSelect = (memberId: string, birthMonth: number) => {
    setOpen(false)
    setSearchQuery('')
    onSelectMember?.(memberId, birthMonth)
  }

  // Ouvrir le popover quand on tape
  useEffect(() => {
    if (searchQuery.length >= 2 && hits.length > 0) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }, [searchQuery, hits.length])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="pl-9 pr-3 h-9"
            data-testid="member-birthdays-search"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandList>
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">Recherche en cours...</div>
            ) : isError ? (
              <CommandEmpty>
                <div className="p-4 text-center">
                  <p className="text-sm text-red-600">Erreur de recherche</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {error instanceof Error ? error.message : 'Erreur inconnue'}
                  </p>
                </div>
              </CommandEmpty>
            ) : hits.length === 0 ? (
              <CommandEmpty>
                {searchQuery.length >= 2
                  ? 'Aucun membre trouvé'
                  : 'Tapez au moins 2 caractères'}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {hits.map((hit) => (
                  <CommandItem
                    key={hit.objectID}
                    value={hit.objectID}
                    onSelect={() => handleSelect(hit.objectID, hit.birthMonth)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={hit.photoURL} />
                        <AvatarFallback className="text-xs">
                          {hit.firstName[0]}{hit.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {hit.firstName} {hit.lastName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{hit.objectID}</p>
                      </div>
                      <span className="text-xs text-pink-600">
                        {new Date(2024, hit.birthMonth - 1, hit.birthDay).toLocaleDateString('fr-FR', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
