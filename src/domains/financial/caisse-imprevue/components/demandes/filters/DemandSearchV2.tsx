/**
 * Composant de recherche contrôlé avec debounce
 *
 * Utilisé par ListDemandesV2 — la recherche filtre la liste via searchQuery dans effectiveFilters.
 * Une seule source de données : useCaisseImprevueDemands avec searchQuery.
 *
 * @see documentation/caisse-imprevue/V2/recherche-demande/sequence/SEQ_RechercherDemandes.puml
 */

'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DemandSearchV2Props {
  /** Valeur contrôlée (searchQuery de ListDemandesV2) */
  value: string
  /** Callback quand l'utilisateur tape (ListDemandesV2 met à jour searchQuery et reset pagination) */
  onChange: (value: string) => void
  /** Debounce en ms — géré par le parent via useDebounce sur value */
  className?: string
}

export function DemandSearchV2({ value, onChange, className }: DemandSearchV2Props) {
  const [isFocused, setIsFocused] = useState(false)

  const handleClear = () => {
    onChange('')
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder:text-gray-400 text-sm"
          data-testid="demand-search-input"
        />
        {value ? (
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
