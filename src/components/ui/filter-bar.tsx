'use client'

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Filter, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Configuration d'un filtre
 */
export interface FilterConfig {
  key: string
  label: string
  type: 'select' | 'date' | 'daterange' | 'checkbox' | 'multiselect'
  options?: { value: string; label: string; icon?: React.ReactNode }[]
  placeholder?: string
  className?: string
}

/**
 * Barre de filtres horizontale standardisée
 * Design système KARA avec animations modernes
 * 
 * Features :
 * - Filtres Select avec icônes optionnelles
 * - Badges animés pour filtres actifs
 * - Bouton "Réinitialiser" avec animation
 * - Variantes de style (default, kara, compact)
 */

type FilterBarVariant = 'default' | 'kara' | 'compact'

interface FilterBarProps {
  filters: FilterConfig[]
  values: Record<string, any>
  onChange: (filterKey: string, value: any) => void
  onReset?: () => void
  className?: string
  showActiveFilters?: boolean
  resetLabel?: string
  variant?: FilterBarVariant
  showIcon?: boolean
}

const variantStyles: Record<FilterBarVariant, {
  container: string
  select: string
  badge: string
  badgeRemove: string
  resetButton: string
  label: string
}> = {
  default: {
    container: '',
    select: 'border-gray-200 focus:border-kara-primary-dark',
    badge: 'bg-gray-100 text-gray-700 border-gray-200',
    badgeRemove: 'hover:text-red-500',
    resetButton: 'border-gray-200 hover:bg-gray-100',
    label: 'text-gray-700',
  },
  kara: {
    container: '',
    select: cn(
      'border-2 border-kara-primary-dark/20 bg-white',
      'focus:border-kara-primary-dark focus:ring-2 focus:ring-kara-primary-light/30',
      'hover:border-kara-primary-dark/40 hover:shadow-sm',
      'transition-all duration-200'
    ),
    badge: cn(
      'bg-gradient-to-r from-kara-primary-dark/10 to-kara-primary-light/10',
      'text-kara-primary-dark border-kara-primary-dark/20',
      'hover:shadow-sm transition-all duration-200'
    ),
    badgeRemove: cn(
      'hover:bg-kara-error/20 hover:text-kara-error',
      'transition-colors duration-200'
    ),
    resetButton: cn(
      'border-2 border-kara-primary-dark/20 text-kara-primary-dark',
      'hover:bg-kara-primary-dark hover:text-white hover:border-kara-primary-dark',
      'hover:shadow-md hover:-translate-y-0.5',
      'active:translate-y-0 transition-all duration-200'
    ),
    label: 'text-kara-primary-dark font-medium',
  },
  compact: {
    container: '',
    select: 'border-0 bg-gray-100 focus:bg-white focus:ring-2 focus:ring-kara-primary-dark/20',
    badge: 'bg-kara-primary-dark/10 text-kara-primary-dark border-0',
    badgeRemove: 'hover:text-red-500',
    resetButton: 'border-0 bg-gray-100 hover:bg-gray-200 text-gray-700',
    label: 'text-gray-600 text-xs uppercase tracking-wider',
  },
}

export function FilterBar({
  filters,
  values,
  onChange,
  onReset,
  className,
  showActiveFilters = true,
  resetLabel = 'Réinitialiser',
  variant = 'kara',
  showIcon = true,
}: FilterBarProps) {
  const styles = variantStyles[variant]
  
  const activeFiltersCount = filters.filter(
    (filter) => {
      const value = values[filter.key]
      return value !== undefined && value !== null && value !== '' && value !== 'all'
    }
  ).length

  const handleFilterChange = (key: string, value: string) => {
    onChange(key, value === 'all' ? undefined : value)
  }

  const renderFilter = (filter: FilterConfig) => {
    const value = values[filter.key] || 'all'

    switch (filter.type) {
      case 'select':
        if (!filter.options) {
          console.warn(`Filter ${filter.key} de type 'select' n'a pas d'options`)
          return null
        }

        return (
          <div 
            key={filter.key} 
            className={cn(
              'space-y-1.5',
              'animate-in fade-in-0 slide-in-from-left-2 duration-300',
              filter.className
            )}
          >
            <label className={cn('text-xs font-medium', styles.label)}>
              {filter.label}
            </label>
            <Select value={value} onValueChange={(val) => handleFilterChange(filter.key, val)}>
              <SelectTrigger className={cn('w-full sm:w-[180px] h-10', styles.select)}>
                <SelectValue placeholder={filter.placeholder || `Tous les ${filter.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent className="animate-in fade-in-0 zoom-in-95 duration-200">
                <SelectItem value="all" className="font-medium">
                  Tous
                </SelectItem>
                {filter.options.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="flex items-center gap-2"
                  >
                    {option.icon && <span className="mr-2">{option.icon}</span>}
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      default:
        console.warn(`Type de filtre non supporté: ${filter.type}`)
        return null
    }
  }

  return (
    <div className={cn('space-y-3', className)} data-testid="filter-bar">
      {/* Barre de filtres */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        {/* Icône filter (optionnel) */}
        {showIcon && variant === 'kara' && (
          <div className="hidden sm:flex items-end pb-0.5">
            <div className={cn(
              'p-2.5 rounded-xl bg-gradient-to-br from-kara-primary-dark to-kara-secondary-dark',
              'shadow-lg shadow-kara-primary-dark/20',
              activeFiltersCount > 0 && 'ring-2 ring-kara-primary-light ring-offset-2'
            )}>
              <Filter className="h-4 w-4 text-white" />
            </div>
          </div>
        )}
        
        {filters.map(renderFilter)}

        {/* Bouton réinitialiser */}
        {onReset && activeFiltersCount > 0 && (
          <div className="flex items-end animate-in fade-in-0 slide-in-from-right-2 duration-300">
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className={cn('h-10 w-full sm:w-auto gap-2', styles.resetButton)}
            >
              <RotateCcw className="h-4 w-4" />
              {resetLabel}
            </Button>
          </div>
        )}
      </div>

      {/* Affichage des filtres actifs (badges) */}
      {showActiveFilters && activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <span className={cn('text-xs font-semibold uppercase tracking-wider', styles.label)}>
            Filtres actifs :
          </span>
          {filters.map((filter) => {
            const value = values[filter.key]
            if (!value || value === 'all') return null

            const option = filter.options?.find((opt) => opt.value === value)
            const displayLabel = option?.label || value

            return (
              <Badge
                key={filter.key}
                variant="outline"
                className={cn(
                  'gap-1.5 px-3 py-1.5 text-xs font-medium',
                  'animate-in fade-in-0 zoom-in-95 duration-200',
                  styles.badge
                )}
              >
                {option?.icon && <span className="opacity-70">{option.icon}</span>}
                <span className="font-semibold">{filter.label}:</span>
                <span>{displayLabel}</span>
                <button
                  type="button"
                  onClick={() => onChange(filter.key, undefined)}
                  className={cn(
                    'ml-1 rounded-full p-0.5',
                    'transition-all duration-200',
                    styles.badgeRemove
                  )}
                  aria-label={`Supprimer le filtre ${filter.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
