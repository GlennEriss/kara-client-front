'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Filter, Search, RefreshCw } from 'lucide-react'
import { ContractCIStatus, CONTRACT_CI_STATUS_LABELS } from '@/types/types'
import { ContractsCIFilters } from '@/hooks/caisse-imprevue/useContractsCI'
import type { CaisseImprevuePaymentFrequency } from '@/types/types'

interface FiltersCIProps {
  filters: ContractsCIFilters
  onFiltersChange: (filters: ContractsCIFilters) => void
  onReset: () => void
  /** Quand true, le filtre "Type de contrat" est pris en compte (ex. onglet "Tous"). Quand false, il est masqué ou désactivé (ex. onglet Journalier/Mensuel). */
  showPaymentFrequencyFilter?: boolean
}

const STATUS_LABELS: Record<ContractCIStatus | 'all', string> = {
  all: 'Tous les statuts',
  ...CONTRACT_CI_STATUS_LABELS
}

const PAYMENT_FREQUENCY_LABELS: Record<CaisseImprevuePaymentFrequency | 'all', string> = {
  all: 'Tous les types',
  DAILY: 'Quotidien',
  MONTHLY: 'Mensuel',
}

export default function FiltersCI({ filters, onFiltersChange, onReset, showPaymentFrequencyFilter = true }: FiltersCIProps) {
  return (
    <Card className="bg-gradient-to-r from-white via-gray-50/50 to-white border-0 shadow-xl">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg">
              <Filter className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Filtres</h3>
              <p className="text-gray-600">Affinez votre recherche</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un contrat..."
                className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] w-full sm:w-auto transition-all duration-200"
                value={filters.search || ''}
                onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              />
            </div>

            {showPaymentFrequencyFilter && (
              <select
                className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200"
                value={filters.paymentFrequency || 'all'}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    paymentFrequency: e.target.value as CaisseImprevuePaymentFrequency | 'all',
                  })
                }
                title="Type de contrat"
              >
                <option value="all">{PAYMENT_FREQUENCY_LABELS.all}</option>
                <option value="DAILY">{PAYMENT_FREQUENCY_LABELS.DAILY}</option>
                <option value="MONTHLY">{PAYMENT_FREQUENCY_LABELS.MONTHLY}</option>
              </select>
            )}

            <select
              className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200"
              value={filters.status || 'all'}
              onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as ContractCIStatus | 'all' })}
            >
              <option value="all">{STATUS_LABELS.all}</option>
              <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
              <option value="FINISHED">{STATUS_LABELS.FINISHED}</option>
              <option value="CANCELED">{STATUS_LABELS.CANCELED}</option>
            </select>

            <Button
              variant="outline"
              onClick={onReset}
              className="px-4 py-2.5 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 hover:scale-105"
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

