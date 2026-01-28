/**
 * Composant de tri pour les demandes
 * 
 * Responsive : Mobile (pleine largeur), Desktop (compact)
 */

'use client'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SortParams } from '../../../entities/demand-filters.types'

interface DemandSortV2Props {
  sort: SortParams
  onSortChange: (sort: SortParams) => void
  className?: string
}

export function DemandSortV2({ sort, onSortChange, className }: DemandSortV2Props) {
  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('_')
    onSortChange({
      sortBy: sortBy as 'date' | 'alphabetical',
      sortOrder: sortOrder as 'asc' | 'desc',
    })
  }

  const currentValue = `${sort.sortBy}_${sort.sortOrder}`

  return (
    <div className={`w-full md:w-auto ${className}`}>
      <Label htmlFor="sort-filter" className="text-xs md:text-sm">
        Tri
      </Label>
      <Select value={currentValue} onValueChange={handleSortChange}>
        <SelectTrigger id="sort-filter" className="w-full md:w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date_desc">Date décroissante</SelectItem>
          <SelectItem value="date_asc">Date croissante</SelectItem>
          <SelectItem value="alphabetical_asc">Nom A→Z</SelectItem>
          <SelectItem value="alphabetical_desc">Nom Z→A</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
