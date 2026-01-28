/**
 * Composant de filtres pour les demandes
 * 
 * Responsive : Mobile (empilé), Desktop (horizontal)
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
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
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

  return (
    <div className={cn('flex flex-col sm:flex-row items-start sm:items-end gap-3 sm:gap-4', className)}>
      {/* Filtre fréquence */}
      <div className="w-full sm:w-auto flex-shrink-0">
        <Label htmlFor="frequency-filter" className="text-xs sm:text-sm mb-1.5 block">
          Fréquence
        </Label>
        <Select
          value={filters.paymentFrequency || 'all'}
          onValueChange={(value) =>
            handleFilterChange('paymentFrequency', value === 'all' ? 'all' : (value as CaisseImprevuePaymentFrequency))
          }
        >
          <SelectTrigger id="frequency-filter" className="w-full sm:w-[180px]">
            <SelectValue placeholder="Toutes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="DAILY">Quotidien</SelectItem>
            <SelectItem value="MONTHLY">Mensuel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filtre forfait */}
      {subscriptions && subscriptions.length > 0 && (
        <div className="w-full sm:w-auto flex-shrink-0">
          <Label htmlFor="subscription-filter" className="text-xs sm:text-sm mb-1.5 block">
            Forfait
          </Label>
          <Select
            value={filters.subscriptionCIID || 'all'}
            onValueChange={(value) =>
              handleFilterChange('subscriptionCIID', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger id="subscription-filter" className="w-full sm:w-[200px]">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {subscriptions.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>
                  {sub.label || sub.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Bouton réinitialiser */}
      <div className="w-full sm:w-auto flex-shrink-0 sm:ml-auto">
        <Button
          variant="outline"
          onClick={handleReset}
          className="w-full sm:w-auto"
          data-testid="demand-filters-reset"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Réinitialiser
        </Button>
      </div>
    </div>
  )
}
