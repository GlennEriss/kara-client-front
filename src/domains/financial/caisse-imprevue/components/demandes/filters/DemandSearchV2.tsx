/**
 * Composant de recherche avec cache et debounce
 * 
 * Responsive : Mobile (pleine largeur), Desktop (max-width)
 */

'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useDebounce } from '@/hooks/shared/useDebounce'
import { useDemandSearch } from '../../hooks/useDemandSearch'
import type { DemandFilters } from '../../../entities/demand-filters.types'

interface DemandSearchV2Props {
  onResultsChange?: (results: import('../../../entities/demand.types').CaisseImprevueDemand[]) => void
  filters?: DemandFilters
  className?: string
}

export function DemandSearchV2({ onResultsChange, filters, className }: DemandSearchV2Props) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  const { data: results, isLoading } = useDemandSearch(debouncedQuery, filters, 50)

  useEffect(() => {
    if (onResultsChange && results) {
      onResultsChange(results)
    }
  }, [results, onResultsChange])

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kara-neutral-400" />
      <Input
        type="text"
        placeholder="Rechercher par nom ou prénom..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10 w-full"
        data-testid="demand-search-input"
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-kara-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
