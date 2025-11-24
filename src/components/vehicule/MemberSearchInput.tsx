'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, User, X, Phone } from 'lucide-react'
import { useSearchMembers } from '@/hooks/useMembers'
import { User as UserType } from '@/types/types'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface MemberSearchInputProps {
  value: string // memberId sélectionné
  onChange: (memberId: string, member: UserType | null) => void
  selectedMemberId?: string
  error?: string
  disabled?: boolean
  label?: string
  placeholder?: string
  initialDisplayName?: string
}

export default function MemberSearchInput({
  value,
  onChange,
  selectedMemberId,
  error,
  disabled = false,
  label = 'Rechercher un membre',
  placeholder = 'Rechercher par nom, prénom ou matricule...',
  initialDisplayName
}: MemberSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState(initialDisplayName || '')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Recherche membres avec debounce intégré dans useSearchMembers
  const { data: members, isLoading } = useSearchMembers(
    searchQuery,
    searchQuery.length >= 2 && isOpen && !disabled
  )

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Gérer la sélection d'un membre
  const handleSelect = (member: UserType) => {
    onChange(member.id!, member)
    setSearchQuery(`${member.firstName} ${member.lastName}`)
    setIsOpen(false)
  }

  const handleClear = () => {
    setSearchQuery('')
    onChange('', null)
    setIsOpen(false)
  }

  // Afficher le membre sélectionné si value est défini
  const selectedMember = React.useMemo(() => {
    if (!value && !selectedMemberId) return null
    if (members && members.length > 0) {
      return members.find(m => m.id === value || m.id === selectedMemberId) || null
    }
    return null
  }, [value, selectedMemberId, members])

  // Mettre à jour le champ de recherche si un membre est sélectionné
  useEffect(() => {
    if (selectedMember && !searchQuery) {
      setSearchQuery(`${selectedMember.firstName} ${selectedMember.lastName}`)
    }
  }, [selectedMember, searchQuery])

  useEffect(() => {
    if (initialDisplayName && !value && !searchQuery) {
      setSearchQuery(initialDisplayName)
    }
  }, [initialDisplayName, value, searchQuery])

  const hasResults = (members?.length || 0) > 0
  const showDropdown = isOpen && searchQuery.length >= 2 && !disabled

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      {label && (
        <Label htmlFor="member-search">
          {label} <span className="text-red-500">*</span>
        </Label>
      )}
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          id="member-search"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setIsOpen(true)
            // Si on efface, désélectionner
            if (e.target.value === '') {
              onChange('', null)
            }
          }}
          onFocus={() => {
            if (searchQuery.length >= 2) {
              setIsOpen(true)
            }
          }}
          disabled={disabled}
          className={cn(
            "pl-10 pr-10",
            error && "border-red-500",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        {searchQuery && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Dropdown avec résultats */}
      {showDropdown && (
        <Card className="absolute z-50 w-full mt-1 shadow-lg border border-gray-200 max-h-80 overflow-y-auto">
          <CardContent className="p-2">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : hasResults ? (
              <div className="space-y-1">
                {members?.slice(0, 10).map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleSelect(member)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left",
                      (value === member.id || selectedMemberId === member.id) && "bg-blue-50 border border-blue-200"
                    )}
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      {member.photoURL ? (
                        <AvatarImage src={member.photoURL} alt={`${member.firstName} ${member.lastName}`} />
                      ) : (
                        <AvatarFallback className="bg-[#234D65] text-white text-sm">
                          {`${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">
                          {member.firstName} {member.lastName}
                        </p>
                        {(value === member.id || selectedMemberId === member.id) && (
                          <div className="flex-shrink-0">
                            <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                              <X className="h-3 w-3 text-white rotate-45" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {member.matricule && (
                          <p className="text-xs text-gray-600">
                            {member.matricule}
                          </p>
                        )}
                        {member.contacts && member.contacts.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Phone className="h-3 w-3" />
                            <span>{member.contacts[0]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                {members && members.length > 10 && (
                  <p className="text-xs text-gray-500 text-center py-2">
                    {members.length - 10} autre(s) résultat(s). Affinez votre recherche.
                  </p>
                )}
              </div>
            ) : searchQuery.length >= 2 ? (
              <div className="text-center py-6">
                <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Aucun membre trouvé</p>
                <p className="text-xs text-gray-500 mt-1">
                  Essayez avec un autre nom, prénom ou matricule
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Afficher le membre sélectionné */}
      {selectedMember && !isOpen && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {selectedMember.photoURL ? (
                <AvatarImage src={selectedMember.photoURL} />
              ) : (
                <AvatarFallback className="bg-[#234D65] text-white">
                  {`${selectedMember.firstName?.[0] || ''}${selectedMember.lastName?.[0] || ''}`.toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {selectedMember.firstName} {selectedMember.lastName}
              </p>
              <div className="flex items-center gap-3 mt-1">
                {selectedMember.matricule && (
                  <p className="text-xs text-gray-600">
                    Matricule: {selectedMember.matricule}
                  </p>
                )}
                {selectedMember.contacts && selectedMember.contacts.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Phone className="h-3 w-3" />
                    <span>{selectedMember.contacts[0]}</span>
                  </div>
                )}
              </div>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Désélectionner"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

