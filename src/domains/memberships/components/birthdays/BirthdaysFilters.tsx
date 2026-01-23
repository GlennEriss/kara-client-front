/**
 * Composant de filtres par mois pour les anniversaires
 * 
 * Permet la multi-sélection de mois (ex: Janvier + Février).
 * Inclut un bouton de réinitialisation pour remettre à "Tous les mois".
 */

'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
]

export interface BirthdaysFiltersProps {
  selectedMonths: number[] // 1-12
  onMonthsChange: (months: number[]) => void
}

export function BirthdaysFilters({
  selectedMonths,
  onMonthsChange,
}: BirthdaysFiltersProps) {
  const toggleMonth = (month: number) => {
    if (selectedMonths.includes(month)) {
      // Désélectionner
      onMonthsChange(selectedMonths.filter((m) => m !== month))
    } else {
      // Sélectionner (max 10 pour la limite Firestore)
      if (selectedMonths.length < 10) {
        onMonthsChange([...selectedMonths, month].sort((a, b) => a - b))
      }
    }
  }

  const resetFilters = () => {
    onMonthsChange([])
  }

  const hasFilters = selectedMonths.length > 0

  return (
    <div className="space-y-3" data-testid="member-birthdays-month-filter">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Filtrer par mois</h3>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-7 text-xs"
            data-testid="member-birthdays-reset-filters"
          >
            Réinitialiser
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {MONTHS.map((month, index) => {
          const monthNumber = index + 1
          const isSelected = selectedMonths.includes(monthNumber)

          return (
            <Button
              key={monthNumber}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleMonth(monthNumber)}
              className={cn(
                'h-8 text-xs',
                isSelected && 'bg-pink-600 hover:bg-pink-700',
              )}
              data-testid={`month-filter-${monthNumber}`}
            >
              {month}
            </Button>
          )
        })}
      </div>

      {hasFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500">Mois sélectionnés :</span>
          {selectedMonths.map((month) => (
            <Badge
              key={month}
              variant="secondary"
              className="text-xs"
            >
              {MONTHS[month - 1]}
              <button
                onClick={() => toggleMonth(month)}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                aria-label={`Retirer ${MONTHS[month - 1]}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {selectedMonths.length >= 10 && (
        <p className="text-xs text-amber-600">
          Maximum 10 mois sélectionnés (limite Firestore)
        </p>
      )}
    </div>
  )
}
