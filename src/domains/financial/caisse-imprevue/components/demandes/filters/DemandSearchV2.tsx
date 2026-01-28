/**
 * Composant de recherche avec cache et debounce
 * 
 * Responsive : Mobile (pleine largeur), Desktop (max-width)
 */

'use client'

import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { useDebounce } from '@/hooks/shared/useDebounce'
import { useDemandSearch } from '@/domains/financial/caisse-imprevue/hooks'
import type { DemandFilters } from '../../../entities/demand-filters.types'
import { cn } from '@/lib/utils'

interface DemandSearchV2Props {
  onResultsChange?: (results: import('../../../entities/demand.types').CaisseImprevueDemand[]) => void
  filters?: DemandFilters
  className?: string
}

export function DemandSearchV2({ onResultsChange, filters, className }: DemandSearchV2Props) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const debouncedQuery = useDebounce(query, 300)

  const { data: results, isLoading } = useDemandSearch(debouncedQuery, filters, 50)

  useEffect(() => {
    if (onResultsChange && results) {
      onResultsChange(results)
    }
  }, [results, onResultsChange])

  const handleClear = () => {
    setQuery('')
  }

  return (
    <div className={cn('relative group', className)}>
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 bg-white transition-all duration-200',
          isFocused
            ? 'border-[#234D65] shadow-lg shadow-[#234D65]/10'
            : 'border-gray-200 hover:border-gray-300'
        )}
      >
        <Search
          className={cn(
            'w-5 h-5 transition-colors flex-shrink-0',
            isFocused ? 'text-[#234D65]' : 'text-gray-400'
          )}
        />
        <input
          type="text"
          placeholder="Rechercher par nom, prénom ou matricule..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder:text-gray-400 text-sm"
          data-testid="demand-search-input"
        />
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-[#234D65] border-t-transparent rounded-full animate-spin flex-shrink-0" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
