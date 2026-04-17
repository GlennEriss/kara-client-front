'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useMemberGlobalSearch } from '../hooks/useMemberGlobalSearch'
import { MemberOverviewPanel } from './MemberOverviewPanel'

export function MemberNavbarSearch() {
  const [query, setQuery] = useState('')
  const [openDropdown, setOpenDropdown] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>()
  const [panelOpen, setPanelOpen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  const normalized = useMemo(() => query.trim(), [query])
  const { data: results = [], isLoading } = useMemberGlobalSearch(normalized, openDropdown)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleClear = () => {
    setQuery('')
    setOpenDropdown(false)
  }

  return (
    <>
      <div ref={containerRef} className="relative w-[320px] max-w-[45vw]">
        <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpenDropdown(true)
          }}
          onFocus={() => {
            if (normalized.length >= 2) setOpenDropdown(true)
          }}
          placeholder="Rechercher un membre..."
          className="h-10 rounded-lg border-gray-200 bg-white pl-9 pr-9 text-sm"
        />
        {query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        {openDropdown && normalized.length >= 2 ? (
          <Card className="absolute right-0 z-50 mt-2 w-full border border-gray-200 shadow-xl">
            <CardContent className="max-h-80 overflow-y-auto p-2">
              {isLoading ? (
                <p className="p-2 text-xs text-gray-500">Recherche en cours...</p>
              ) : results.length === 0 ? (
                <p className="p-2 text-xs text-gray-500">Aucun membre trouvé</p>
              ) : (
                <div className="space-y-1">
                  {results.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setSelectedMemberId(member.id)
                        setQuery(`${member.firstName} ${member.lastName}`)
                        setOpenDropdown(false)
                        setPanelOpen(true)
                      }}
                      className={cn(
                        'w-full rounded-md border border-transparent p-2 text-left transition-colors',
                        'hover:border-gray-200 hover:bg-gray-50',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {member.photoURL ? (
                            <AvatarImage src={member.photoURL} alt={`${member.firstName} ${member.lastName}`} />
                          ) : (
                            <AvatarFallback className="bg-[#234D65] text-xs text-white">
                              {`${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {member.matricule || member.contacts?.[0] || 'Sans contact'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <MemberOverviewPanel memberId={selectedMemberId} open={panelOpen} onOpenChange={setPanelOpen} />
    </>
  )
}

