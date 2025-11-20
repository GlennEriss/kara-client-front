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

  return (
    <div className="space-y-4">
      {/* Filtres de statut */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status === 'all' ? 'Tous' : CHARITY_EVENT_STATUS_LABELS[status as CharityEventStatus]}
          </Button>
        ))}
      </div>

      {/* Barre de recherche et actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher un évènement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          {/* Toggle vue */}
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('table')}
            title="Vue tableau"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
            title="Vue grille"
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
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}

          {/* Bouton créer */}
          <Button onClick={onCreateEvent}>
            <Plus className="w-4 h-4 mr-2" />
            Créer un évènement
          </Button>
        </div>
      </div>
    </div>
  )
}

