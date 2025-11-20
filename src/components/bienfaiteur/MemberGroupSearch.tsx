'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Search, User, Users, Loader2, X, Check } from 'lucide-react'
import { useSearchMembers } from '@/hooks/useMembers'
import { useCharityGroups } from '@/hooks/bienfaiteur/useCharityGroups'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface MemberGroupSearchProps {
  participantType: 'member' | 'group'
  onSelect: (id: string, type: 'member' | 'group', displayName: string) => void
  selectedId?: string
  selectedType?: 'member' | 'group'
  error?: string
  label?: string
}

export default function MemberGroupSearch({
  participantType,
  onSelect,
  selectedId,
  selectedType,
  error,
  label
}: MemberGroupSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Recherche membres (seulement si participantType === 'member')
  const { data: members, isLoading: isLoadingMembers } = useSearchMembers(
    searchQuery,
    participantType === 'member' && searchQuery.length >= 2 && isOpen
  )

  // Recherche groupes (seulement si participantType === 'group')
  const { data: groups, isLoading: isLoadingGroups } = useCharityGroups()

  // Filtrer les groupes localement selon la recherche
  const filteredGroups = React.useMemo(() => {
    if (!groups || !searchQuery || searchQuery.length < 2) return []
    const query = searchQuery.toLowerCase()
    return groups.filter(group =>
      group.name.toLowerCase().includes(query) ||
      (group.label || '').toLowerCase().includes(query) ||
      (group.description || '').toLowerCase().includes(query)
    )
  }, [groups, searchQuery])

  const isLoading = isLoadingMembers || (isLoadingGroups && participantType === 'group')
  const hasResults = (participantType === 'member' ? (members?.length || 0) : filteredGroups.length) > 0

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

  const handleSelect = (id: string, type: 'member' | 'group', displayName: string) => {
    onSelect(id, type, displayName)
    setSearchQuery(displayName)
    setIsOpen(false)
  }

  const handleClear = () => {
    setSearchQuery('')
    onSelect('', participantType, '')
    setIsOpen(false)
  }

  const getSelectedDisplayName = () => {
    if (!selectedId) return ''
    if (selectedType === 'member' && members) {
      const member = members.find(m => m.id === selectedId)
      return member ? `${member.firstName} ${member.lastName}` : ''
    }
    if (selectedType === 'group' && groups) {
      const group = groups.find(g => g.id === selectedId)
      return group ? group.name : ''
    }
    return ''
  }

  // Si un membre/groupe est déjà sélectionné, afficher son nom
  useEffect(() => {
    if (selectedId && !searchQuery) {
      const displayName = getSelectedDisplayName()
      if (displayName) {
        setSearchQuery(displayName)
      }
    }
  }, [selectedId])

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      {label && (
        <Label htmlFor={`search-${participantType}`}>
          {label} *
        </Label>
      )}
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          id={`search-${participantType}`}
          placeholder={
            participantType === 'member'
              ? 'Rechercher un membre par nom, matricule...'
              : 'Rechercher un groupe par nom...'
          }
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => {
            if (searchQuery.length >= 2) {
              setIsOpen(true)
            }
          }}
          className={cn(
            "pl-10 pr-10",
            error && "border-red-500"
          )}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Dropdown avec résultats */}
      {isOpen && searchQuery.length >= 2 && (
        <Card className="absolute z-50 w-full mt-1 max-h-80 overflow-auto shadow-lg border">
          <CardContent className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
                <span className="text-sm text-gray-500">Recherche en cours...</span>
              </div>
            ) : (
              <>
                {participantType === 'member' ? (
                  <>
                    {members && members.length > 0 ? (
                      <div className="space-y-1">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            onClick={() => handleSelect(member.id, 'member', `${member.firstName} ${member.lastName}`)}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                              selectedId === member.id
                                ? "bg-blue-50 border-2 border-blue-500"
                                : "hover:bg-gray-50 border-2 border-transparent"
                            )}
                          >
                            <Avatar>
                              <AvatarImage src={member.photoURL || ''} />
                              <AvatarFallback>
                                {`${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {member.firstName} {member.lastName}
                              </div>
                              <div className="text-sm text-gray-500 truncate">
                                {member.matricule && `Matricule: ${member.matricule}`}
                                {member.contacts?.[0] && ` • ${member.contacts[0]}`}
                              </div>
                            </div>
                            {selectedId === member.id && (
                              <Check className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Aucun membre trouvé</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {filteredGroups.length > 0 ? (
                      <div className="space-y-1">
                        {filteredGroups.map((group) => (
                          <div
                            key={group.id}
                            onClick={() => handleSelect(group.id, 'group', group.name)}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                              selectedId === group.id
                                ? "bg-blue-50 border-2 border-blue-500"
                                : "hover:bg-gray-50 border-2 border-transparent"
                            )}
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <Users className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{group.name}</div>
                              {group.label && (
                                <Badge variant="secondary" className="mt-1 text-xs">
                                  {group.label}
                                </Badge>
                              )}
                            </div>
                            {selectedId === group.id && (
                              <Check className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Aucun groupe trouvé</p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

