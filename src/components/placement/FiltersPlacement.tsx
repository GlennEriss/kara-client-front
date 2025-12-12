'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Filter, Search, RefreshCw } from 'lucide-react'
import { PlacementStatus, PayoutMode } from '@/types/types'

export interface PlacementFilters {
  search: string
  status: PlacementStatus | 'all'
  payoutMode: PayoutMode | 'all'
  periodMonths: string // 'all' ou '1-3', '4-7'
  monthOnly: boolean
  lateOnly: boolean
}

interface FiltersPlacementProps {
  filters: PlacementFilters
  onFiltersChange: (filters: PlacementFilters) => void
  onReset: () => void
}

const STATUS_LABELS: Record<PlacementStatus | 'all', string> = {
  all: 'Tous les statuts',
  Draft: 'Brouillon',
  Active: 'Actif',
  Closed: 'Clos',
  Canceled: 'Annulé',
  EarlyExit: 'Sortie anticipée',
}

const PAYOUT_MODE_LABELS: Record<PayoutMode | 'all', string> = {
  all: 'Tous les modes',
  MonthlyCommission_CapitalEnd: 'Commission mensuelle',
  CapitalPlusCommission_End: 'Capital + Commission à la fin',
}

const PERIOD_LABELS: Record<string, string> = {
  all: 'Toutes les périodes',
  '1-3': '1 à 3 mois',
  '4-7': '4 à 7 mois',
}

export default function FiltersPlacement({ filters, onFiltersChange, onReset }: FiltersPlacementProps) {
  return (
    <Card className="bg-gradient-to-r from-white via-gray-50/50 to-white border-0 shadow-md">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-md">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Filtres</h3>
              <p className="text-sm text-gray-600">Affinez votre recherche</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Recherche */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher (nom, prénom, matricule, id)..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] w-full transition-all duration-200 text-sm"
                value={filters.search}
                onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              />
            </div>

            {/* Statut */}
            <select
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200 text-sm min-w-[140px]"
              value={filters.status}
              onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as PlacementStatus | 'all' })}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* Mode de paiement */}
            <select
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200 text-sm min-w-[160px]"
              value={filters.payoutMode}
              onChange={(e) => onFiltersChange({ ...filters, payoutMode: e.target.value as PayoutMode | 'all' })}
            >
              {Object.entries(PAYOUT_MODE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* Période */}
            <select
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200 text-sm min-w-[140px]"
              value={filters.periodMonths}
              onChange={(e) => onFiltersChange({ ...filters, periodMonths: e.target.value })}
            >
              {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* Commissions du mois */}
            <Button
              type="button"
              variant={filters.monthOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFiltersChange({ ...filters, monthOnly: !filters.monthOnly, lateOnly: filters.monthOnly ? filters.lateOnly : false })}
              className={filters.monthOnly ? 'bg-[#234D65] text-white' : ''}
            >
              Commissions du mois
            </Button>

            {/* En retard */}
            <Button
              type="button"
              variant={filters.lateOnly ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => onFiltersChange({ ...filters, lateOnly: !filters.lateOnly, monthOnly: filters.lateOnly ? filters.monthOnly : false })}
              className={filters.lateOnly ? '' : 'text-gray-700'}
            >
              En retard
            </Button>

            {/* Bouton reset */}
            <Button
              variant="outline"
              onClick={onReset}
              className="px-3 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 text-sm"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

