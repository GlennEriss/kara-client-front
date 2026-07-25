'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Filter, RefreshCw, Search, X } from 'lucide-react'

/**
 * Filtres de l'historique des contrats d'un membre.
 *
 * Partagés par les onglets Caisse Spéciale et Caisse Imprévue : les deux listes
 * exposent les mêmes axes (n° de contrat, statut, période de création, tri),
 * seuls les statuts disponibles diffèrent d'un onglet à l'autre.
 */
export interface ContractsHistoryFilters {
  search: string
  status: string
  from: string
  to: string
  sort: ContractsHistorySort
}

export type ContractsHistorySort = 'recent' | 'oldest' | 'amountDesc' | 'amountAsc'

export const DEFAULT_CONTRACTS_HISTORY_FILTERS: ContractsHistoryFilters = {
  search: '',
  status: 'all',
  from: '',
  to: '',
  sort: 'recent',
}

const SORT_LABELS: Record<ContractsHistorySort, string> = {
  recent: 'Plus récents',
  oldest: 'Plus anciens',
  amountDesc: 'Montant décroissant',
  amountAsc: 'Montant croissant',
}

/** Nombre de critères appliqués — le tri n'en est pas un. */
export function countActiveContractsFilters(filters: ContractsHistoryFilters): number {
  let count = 0
  if (filters.search.trim()) count++
  if (filters.status !== 'all') count++
  if (filters.from) count++
  if (filters.to) count++
  return count
}

/** Applique les critères communs à n'importe quelle liste de contrats. */
export function applyContractsHistoryFilters<T>(
  items: T[],
  filters: ContractsHistoryFilters,
  accessors: {
    id: (item: T) => string
    status: (item: T) => string
    createdAt: (item: T) => Date | null
    amount: (item: T) => number
    /** Texte libre supplémentaire (libellé de forfait, type de caisse…). */
    searchable?: (item: T) => string
  }
): T[] {
  let result = [...items]

  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()
    result = result.filter((item) => {
      const extra = accessors.searchable?.(item)?.toLowerCase() ?? ''
      return accessors.id(item).toLowerCase().includes(q) || extra.includes(q)
    })
  }

  if (filters.status !== 'all') {
    result = result.filter((item) => accessors.status(item) === filters.status)
  }

  if (filters.from || filters.to) {
    const from = filters.from ? new Date(`${filters.from}T00:00:00`) : null
    const to = filters.to ? new Date(`${filters.to}T23:59:59`) : null
    result = result.filter((item) => {
      const created = accessors.createdAt(item)
      if (!created) return false
      if (from && created < from) return false
      if (to && created > to) return false
      return true
    })
  }

  const time = (item: T) => accessors.createdAt(item)?.getTime() ?? 0
  result.sort((a, b) => {
    switch (filters.sort) {
      case 'oldest':
        return time(a) - time(b)
      case 'amountDesc':
        return accessors.amount(b) - accessors.amount(a)
      case 'amountAsc':
        return accessors.amount(a) - accessors.amount(b)
      default:
        return time(b) - time(a)
    }
  })

  return result
}

const controlClass =
  'px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200 text-sm'

interface ContractsHistoryFiltersBarProps {
  filters: ContractsHistoryFilters
  onFiltersChange: (filters: ContractsHistoryFilters) => void
  onReset: () => void
  /** Statuts proposés, propres à chaque type de contrat. */
  statusOptions: Array<{ value: string; label: string }>
  resultCount: number
  totalCount: number
}

export default function ContractsHistoryFiltersBar({
  filters,
  onFiltersChange,
  onReset,
  statusOptions,
  resultCount,
  totalCount,
}: ContractsHistoryFiltersBarProps) {
  const activeCount = countActiveContractsFilters(filters)
  const set = (patch: Partial<ContractsHistoryFilters>) => onFiltersChange({ ...filters, ...patch })

  return (
    <Card className="mb-4 bg-gradient-to-r from-white via-gray-50/50 to-white border-0 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] p-2 shadow-sm">
              <Filter className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                Filtres
                {activeCount > 0 && (
                  <span className="rounded-full bg-[#234D65] px-2 py-0.5 text-[10px] font-semibold text-white">
                    {activeCount}
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {resultCount} contrat{resultCount !== 1 ? 's' : ''} affiché
                {resultCount !== 1 ? 's' : ''} sur {totalCount}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="N° de contrat, libellé…"
                className={`${controlClass} w-full pl-9 pr-8 placeholder-gray-400`}
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

            <select
              aria-label="Trier les contrats"
              className={`${controlClass} min-w-[170px]`}
              value={filters.sort}
              onChange={(e) => set({ sort: e.target.value as ContractsHistorySort })}
            >
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>Tri : {label}</option>
              ))}
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              disabled={activeCount === 0 && filters.sort === 'recent'}
              className="border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Réinitialiser
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-gray-100 pt-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Statut</span>
            <select
              className={controlClass}
              value={filters.status}
              onChange={(e) => set({ status: e.target.value })}
            >
              <option value="all">Tous les statuts</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Créé à partir du</span>
            <input
              type="date"
              className={controlClass}
              value={filters.from}
              onChange={(e) => set({ from: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Créé jusqu’au</span>
            <input
              type="date"
              className={controlClass}
              value={filters.to}
              onChange={(e) => set({ to: e.target.value })}
            />
          </label>
        </div>
      </CardContent>
    </Card>
  )
}
