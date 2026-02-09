'use client'

import React from 'react'
import { Plus, Search, LayoutGrid, List, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CharityEventStatus, CHARITY_EVENT_STATUS_LABELS } from '@/types/types'

interface CharityFiltersProps {
  statusFilter: CharityEventStatus | 'all'
  setStatusFilter: (status: CharityEventStatus | 'all') => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  viewMode: 'grid' | 'table'
  setViewMode: (mode: 'grid' | 'table') => void
  onCreateEvent: () => void
  onRefresh?: () => void
  isLoading?: boolean
}

export default function CharityFilters({
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  onCreateEvent,
  onRefresh,
  isLoading
}: CharityFiltersProps) {
  const statuses: (CharityEventStatus | 'all')[] = ['all', 'upcoming', 'ongoing', 'closed', 'draft', 'archived']
  const statusClassMap: Record<CharityEventStatus | 'all', string> = {
    all: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
    draft: 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100',
    upcoming: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
    ongoing: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
    closed: 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100',
    archived: 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100',
  }

  return (
    <div className="space-y-4 rounded-2xl border border-cyan-100/80 bg-gradient-to-br from-white to-cyan-50/50 p-4 shadow-[0_12px_30px_-26px_rgba(14,58,94,0.8)]">
      {/* Filtres de statut */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => (
          <Button
            key={status}
            variant="outline"
            size="sm"
            onClick={() => setStatusFilter(status)}
            className={
              statusFilter === status
                ? 'rounded-full border-[#1f4f67] bg-gradient-to-r from-[#1f4f67] to-[#2f7895] text-white shadow-sm hover:opacity-95'
                : `rounded-full ${statusClassMap[status]}`
            }
          >
            {status === 'all' ? 'Tous' : CHARITY_EVENT_STATUS_LABELS[status as CharityEventStatus]}
          </Button>
        ))}
      </div>

      {/* Barre de recherche et actions */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher un évènement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 rounded-xl border-cyan-100 bg-white/80 pl-10 shadow-inner shadow-cyan-100/50"
          />
        </div>

        <div className="flex gap-2">
          {/* Toggle vue */}
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('table')}
            title="Vue tableau"
            className={viewMode === 'table' ? 'bg-[#1f4f67] text-white hover:bg-[#1f4f67]/90' : 'border-cyan-100 bg-white'}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
            title="Vue grille"
            className={viewMode === 'grid' ? 'bg-[#1f4f67] text-white hover:bg-[#1f4f67]/90' : 'border-cyan-100 bg-white'}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>

          {/* Bouton refresh */}
          {onRefresh && (
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={isLoading}
              title="Actualiser"
              className="border-cyan-100 bg-white"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}

          {/* Bouton créer */}
          <Button onClick={onCreateEvent} className="rounded-xl bg-gradient-to-r from-[#1f4f67] to-[#2f7895] text-white shadow-sm hover:opacity-95">
            <Plus className="w-4 h-4 mr-2" />
            Créer un évènement
          </Button>
        </div>
      </div>
    </div>
  )
}
