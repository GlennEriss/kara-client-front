/**
 * Composant de tri pour les demandes
 * 
 * Responsive : Mobile (pleine largeur), Desktop (compact)
 */

'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowUpDown, ArrowDown, ArrowUp, ArrowDownAZ, ArrowUpAZ } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SortParams } from '../../../entities/demand-filters.types'

interface DemandSortV2Props {
  sort: SortParams
  onSortChange: (sort: SortParams) => void
  className?: string
}

const sortOptions = [
  { value: 'date_desc', label: 'Plus récentes', icon: ArrowDown },
  { value: 'date_asc', label: 'Plus anciennes', icon: ArrowUp },
  { value: 'alphabetical_asc', label: 'Nom A→Z', icon: ArrowDownAZ },
  { value: 'alphabetical_desc', label: 'Nom Z→A', icon: ArrowUpAZ },
]

export function DemandSortV2({ sort, onSortChange, className }: DemandSortV2Props) {
  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('_')
    onSortChange({
      sortBy: sortBy as 'date' | 'alphabetical',
      sortOrder: sortOrder as 'asc' | 'desc',
    })
  }

  const currentValue = `${sort.sortBy}_${sort.sortOrder}`
  const currentOption = sortOptions.find((opt) => opt.value === currentValue)

  return (
    <div className={cn('flex-shrink-0', className)}>
      <Select value={currentValue} onValueChange={handleSortChange}>
        <SelectTrigger
          className={cn(
            'w-full sm:w-auto min-w-[160px] h-10 px-3 rounded-xl border-2 border-gray-200',
            'hover:border-gray-300 focus:border-[#234D65] focus:ring-0',
            'bg-white transition-all duration-200'
          )}
        >
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-gray-500" />
            <SelectValue placeholder="Trier par" />
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-xl border-2 border-gray-200 shadow-xl">
          {sortOptions.map((option) => {
            const Icon = option.icon
            return (
              <SelectItem
                key={option.value}
                value={option.value}
                className="rounded-lg focus:bg-[#234D65]/10 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
