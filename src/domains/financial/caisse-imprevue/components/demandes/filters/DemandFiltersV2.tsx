/**
 * Composant de filtres pour les demandes
 * 
 * Responsive : Mobile (empilé), Desktop (horizontal)
 * Design moderne avec badges de filtres actifs
 */

'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RotateCcw, CalendarDays, Calendar, Package, X, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DemandFilters } from '../../../entities/demand-filters.types'
import type { CaisseImprevuePaymentFrequency } from '../../../entities/demand.types'

interface DemandFiltersV2Props {
  filters: DemandFilters
  onFiltersChange: (filters: DemandFilters) => void
  subscriptions?: Array<{ id: string; code: string; label?: string }>
  className?: string
}

export function DemandFiltersV2({
  filters,
  onFiltersChange,
  subscriptions,
  className,
}: DemandFiltersV2Props) {
  const handleFilterChange = (key: keyof DemandFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const handleReset = () => {
    onFiltersChange({
      status: 'all',
      paymentFrequency: 'all',
      subscriptionCIID: undefined,
    })
  }

  // Compter les filtres actifs
  const activeFiltersCount = [
    filters.paymentFrequency && filters.paymentFrequency !== 'all',
    filters.subscriptionCIID,
  ].filter(Boolean).length

  return (
    <div className={cn('space-y-3', className)}>
      {/* Ligne de filtres */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Label Filtres */}
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Filter className="w-4 h-4" />
          <span>Filtres</span>
          {activeFiltersCount > 0 && (
            <Badge className="bg-[#234D65] text-white text-xs px-2 py-0.5 rounded-full">
              {activeFiltersCount}
            </Badge>
          )}
        </div>

        {/* Filtre fréquence */}
        <Select
          value={filters.paymentFrequency || 'all'}
          onValueChange={(value) =>
            handleFilterChange('paymentFrequency', value === 'all' ? 'all' : (value as CaisseImprevuePaymentFrequency))
          }
        >
          <SelectTrigger
            className={cn(
              'w-auto min-w-[140px] h-9 px-3 rounded-full border-2 text-sm',
              'transition-all duration-200',
              filters.paymentFrequency && filters.paymentFrequency !== 'all'
                ? 'border-[#234D65] bg-[#234D65]/5 text-[#234D65]'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="flex items-center gap-2">
              {filters.paymentFrequency === 'DAILY' ? (
                <CalendarDays className="w-4 h-4" />
              ) : filters.paymentFrequency === 'MONTHLY' ? (
                <Calendar className="w-4 h-4" />
              ) : (
                <Calendar className="w-4 h-4 text-gray-400" />
              )}
              <SelectValue placeholder="Fréquence" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-2 border-gray-200 shadow-xl">
            <SelectItem value="all" className="rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>Toutes fréquences</span>
              </div>
            </SelectItem>
            <SelectItem value="DAILY" className="rounded-lg">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-purple-500" />
                <span>Quotidien</span>
              </div>
            </SelectItem>
            <SelectItem value="MONTHLY" className="rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-pink-500" />
                <span>Mensuel</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Filtre forfait */}
        {subscriptions && subscriptions.length > 0 && (
          <Select
            value={filters.subscriptionCIID || 'all'}
            onValueChange={(value) =>
              handleFilterChange('subscriptionCIID', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger
              className={cn(
                'w-auto min-w-[140px] h-9 px-3 rounded-full border-2 text-sm',
                'transition-all duration-200',
                filters.subscriptionCIID
                  ? 'border-[#234D65] bg-[#234D65]/5 text-[#234D65]'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <SelectValue placeholder="Forfait" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-2 border-gray-200 shadow-xl">
              <SelectItem value="all" className="rounded-lg">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span>Tous les forfaits</span>
                </div>
              </SelectItem>
              {subscriptions.map((sub) => (
                <SelectItem key={sub.id} value={sub.id} className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#234D65]" />
                    <span>{sub.label || sub.code}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Bouton réinitialiser */}
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-9 px-3 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            data-testid="demand-filters-reset"
          >
            <X className="w-4 h-4 mr-1" />
            <span className="text-sm">Effacer</span>
          </Button>
        )}
      </div>

      {/* Badges des filtres actifs */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.paymentFrequency && filters.paymentFrequency !== 'all' && (
            <Badge
              variant="secondary"
              className="bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer rounded-full px-3 py-1"
              onClick={() => handleFilterChange('paymentFrequency', 'all')}
            >
              {filters.paymentFrequency === 'DAILY' ? 'Quotidien' : 'Mensuel'}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
          {filters.subscriptionCIID && subscriptions && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer rounded-full px-3 py-1"
              onClick={() => handleFilterChange('subscriptionCIID', undefined)}
            >
              {subscriptions.find((s) => s.id === filters.subscriptionCIID)?.label ||
                subscriptions.find((s) => s.id === filters.subscriptionCIID)?.code}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
