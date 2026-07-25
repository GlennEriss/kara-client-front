'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Filter, RefreshCw, Search, X } from 'lucide-react'

/**
 * Filtres de la liste des placements.
 *
 * Les axes « statut », « mode de reversement », « commissions du mois » et
 * « en retard » sont portés par les onglets de la liste : les dupliquer ici
 * produisait des combinaisons vides (onglet « Actifs » + statut « Brouillon »).
 * Ce panneau ne propose donc que des axes complémentaires aux onglets.
 */
export interface PlacementFilters {
  search: string
  periodMonths: string // 'all' | '1-3' | '4-7'
  amountMin: string
  amountMax: string
  dueFrom: string // prochaine échéance à partir de (yyyy-mm-dd)
  dueTo: string // prochaine échéance jusqu'à (yyyy-mm-dd)
  contractDoc: 'all' | 'with' | 'without'
  sort: PlacementSort
}

export type PlacementSort = 'recent' | 'amountDesc' | 'amountAsc' | 'dueAsc'

export const DEFAULT_PLACEMENT_FILTERS: PlacementFilters = {
  search: '',
  periodMonths: 'all',
  amountMin: '',
  amountMax: '',
  dueFrom: '',
  dueTo: '',
  contractDoc: 'all',
  sort: 'recent',
}

const PERIOD_LABELS: Record<string, string> = {
  all: 'Toutes les durées',
  '1-3': '1 à 3 mois',
  '4-7': '4 à 7 mois',
}

const CONTRACT_DOC_LABELS: Record<PlacementFilters['contractDoc'], string> = {
  all: 'Contrat : tous',
  with: 'Contrat déposé',
  without: 'Contrat manquant',
}

const SORT_LABELS: Record<PlacementSort, string> = {
  recent: 'Plus récents',
  amountDesc: 'Montant décroissant',
  amountAsc: 'Montant croissant',
  dueAsc: 'Échéance la plus proche',
}

/** Nombre de critères réellement appliqués (le tri n'est pas un filtre). */
export function countActivePlacementFilters(filters: PlacementFilters): number {
  let count = 0
  if (filters.search.trim()) count++
  if (filters.periodMonths !== 'all') count++
  if (filters.amountMin.trim()) count++
  if (filters.amountMax.trim()) count++
  if (filters.dueFrom) count++
  if (filters.dueTo) count++
  if (filters.contractDoc !== 'all') count++
  return count
}

interface FiltersPlacementProps {
  filters: PlacementFilters
  onFiltersChange: (filters: PlacementFilters) => void
  onReset: () => void
  /** Nombre de placements affichés après filtrage (retour visuel immédiat). */
  resultCount?: number
}

const selectClass =
  'px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200 text-sm'

export default function FiltersPlacement({
  filters,
  onFiltersChange,
  onReset,
  resultCount,
}: FiltersPlacementProps) {
  const activeCount = countActivePlacementFilters(filters)
  const set = (patch: Partial<PlacementFilters>) => onFiltersChange({ ...filters, ...patch })

  // Seuls des chiffres : évite qu'un montant invalide vide silencieusement la liste.
  const onAmountChange = (key: 'amountMin' | 'amountMax') => (value: string) => {
    const digits = value.replace(/[^\d]/g, '')
    set({ [key]: digits } as Partial<PlacementFilters>)
  }

  return (
    <Card className="bg-gradient-to-r from-white via-gray-50/50 to-white border-0 shadow-md">
      <CardContent className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-md">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Filtres
                {activeCount > 0 && (
                  <span className="rounded-full bg-[#234D65] px-2 py-0.5 text-xs font-semibold text-white">
                    {activeCount}
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-600">
                {typeof resultCount === 'number'
                  ? `${resultCount.toLocaleString('fr-FR')} placement${resultCount !== 1 ? 's' : ''} affiché${resultCount !== 1 ? 's' : ''}`
                  : 'Affinez votre recherche'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Recherche */}
            <div className="relative min-w-[240px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Bienfaiteur, matricule, téléphone, n° de placement…"
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-[#234D65] focus:ring-2 focus:ring-[#234D65]"
                value={filters.search}
                onChange={(e) => set({ search: e.target.value })}
              />
              {filters.search && (
                <button
                  type="button"
                  aria-label="Effacer la recherche"
                  onClick={() => set({ search: '' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Tri */}
            <select
              aria-label="Trier les placements"
              className={`${selectClass} min-w-[180px]`}
              value={filters.sort}
              onChange={(e) => set({ sort: e.target.value as PlacementSort })}
            >
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  Tri : {label}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              onClick={onReset}
              disabled={activeCount === 0 && filters.sort === 'recent'}
              className="border border-gray-200 px-3 py-2 text-sm text-gray-700 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-40"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Réinitialiser
            </Button>
          </div>
        </div>

        {/* Critères complémentaires aux onglets */}
        <div className="grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Durée</span>
            <select
              className={selectClass}
              value={filters.periodMonths}
              onChange={(e) => set({ periodMonths: e.target.value })}
            >
              {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Contrat</span>
            <select
              className={selectClass}
              value={filters.contractDoc}
              onChange={(e) => set({ contractDoc: e.target.value as PlacementFilters['contractDoc'] })}
            >
              {Object.entries(CONTRACT_DOC_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Montant (FCFA)</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Min"
                className={`${selectClass} w-full placeholder-gray-400`}
                value={filters.amountMin}
                onChange={(e) => onAmountChange('amountMin')(e.target.value)}
              />
              <span className="text-gray-400">—</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Max"
                className={`${selectClass} w-full placeholder-gray-400`}
                value={filters.amountMax}
                onChange={(e) => onAmountChange('amountMax')(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Prochaine échéance
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                aria-label="Échéance à partir du"
                className={`${selectClass} w-full`}
                value={filters.dueFrom}
                onChange={(e) => set({ dueFrom: e.target.value })}
              />
              <span className="text-gray-400">—</span>
              <input
                type="date"
                aria-label="Échéance jusqu'au"
                className={`${selectClass} w-full`}
                value={filters.dueTo}
                onChange={(e) => set({ dueTo: e.target.value })}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
