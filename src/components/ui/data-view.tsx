'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { List, LayoutGrid, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Composant pour afficher des données en liste ou en cards
 * Design système KARA avec animations modernes
 * 
 * Features :
 * - Toggle vue liste/cards animé
 * - Message d'état vide personnalisé avec animation
 * - Skeleton de chargement moderne
 * - Variantes de style (default, kara, compact)
 * - Animations d'entrée pour les items
 */

type DataViewVariant = 'default' | 'kara' | 'compact'

interface DataViewProps<T> {
  data: T[]
  viewMode?: 'list' | 'cards'
  onViewModeChange?: (mode: 'list' | 'cards') => void
  renderItem: (item: T, index: number) => React.ReactNode
  renderCard?: (item: T, index: number) => React.ReactNode
  emptyMessage?: string
  emptyDescription?: string
  emptyIcon?: React.ComponentType<{ className?: string }>
  loading?: boolean
  loadingSkeleton?: React.ReactNode
  skeletonCount?: number
  className?: string
  cardClassName?: string
  listClassName?: string
  variant?: DataViewVariant
  animateItems?: boolean
}

const variantStyles: Record<DataViewVariant, {
  toggle: string
  toggleActive: string
  toggleInactive: string
  emptyContainer: string
  emptyIcon: string
  emptyTitle: string
  emptyDescription: string
}> = {
  default: {
    toggle: 'border border-gray-200 bg-gray-50 p-1 rounded-lg',
    toggleActive: 'bg-white shadow-sm text-kara-primary-dark',
    toggleInactive: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
    emptyContainer: 'bg-gray-50 rounded-2xl',
    emptyIcon: 'text-gray-400',
    emptyTitle: 'text-gray-700',
    emptyDescription: 'text-gray-500',
  },
  kara: {
    toggle: cn(
      'border-2 border-kara-primary-dark/20 bg-gradient-to-r from-kara-neutral-50 to-white',
      'p-1 rounded-xl shadow-sm'
    ),
    toggleActive: cn(
      'bg-gradient-to-r from-kara-primary-dark to-kara-secondary-dark',
      'text-white shadow-md shadow-kara-primary-dark/25',
      'scale-105'
    ),
    toggleInactive: cn(
      'text-kara-primary-dark/60 hover:text-kara-primary-dark',
      'hover:bg-kara-primary-dark/5'
    ),
    emptyContainer: cn(
      'bg-gradient-to-br from-kara-neutral-50 to-white',
      'border-2 border-dashed border-kara-primary-dark/20 rounded-2xl'
    ),
    emptyIcon: 'text-kara-primary-dark/30',
    emptyTitle: 'text-kara-primary-dark',
    emptyDescription: 'text-kara-primary-dark/60',
  },
  compact: {
    toggle: 'bg-gray-100 p-0.5 rounded-lg',
    toggleActive: 'bg-white shadow-sm text-kara-primary-dark',
    toggleInactive: 'text-gray-500 hover:text-gray-700',
    emptyContainer: 'bg-gray-50 rounded-xl',
    emptyIcon: 'text-gray-400',
    emptyTitle: 'text-gray-700',
    emptyDescription: 'text-gray-500',
  },
}

export function DataView<T>({
  data,
  viewMode = 'cards',
  onViewModeChange,
  renderItem,
  renderCard,
  emptyMessage = 'Aucune donnée trouvée',
  emptyDescription,
  emptyIcon: EmptyIcon = Inbox,
  loading = false,
  loadingSkeleton,
  skeletonCount = 6,
  className,
  cardClassName,
  listClassName,
  variant = 'kara',
  animateItems = true,
}: DataViewProps<T>) {
  const styles = variantStyles[variant]

  // Skeleton par défaut
  const DefaultSkeleton = () => (
    <div className={cn(
      viewMode === 'cards' 
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
        : 'space-y-3'
    )}>
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <div 
          key={i} 
          className={cn(
            'animate-pulse',
            viewMode === 'cards' ? 'h-48' : 'h-20'
          )}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <Skeleton className={cn(
            'w-full h-full rounded-xl',
            variant === 'kara' && 'bg-gradient-to-r from-kara-neutral-100 to-kara-neutral-200'
          )} />
        </div>
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className={cn('animate-in fade-in-0 duration-300', className)}>
        {loadingSkeleton || <DefaultSkeleton />}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-16 px-6 text-center',
          'animate-in fade-in-0 zoom-in-95 duration-500',
          styles.emptyContainer,
          className
        )}
        data-testid="data-view-empty"
      >
        <div className={cn(
          'p-4 rounded-full mb-4',
          variant === 'kara' && 'bg-kara-primary-dark/5'
        )}>
          <EmptyIcon className={cn('h-12 w-12', styles.emptyIcon)} />
        </div>
        <h3 className={cn('text-lg font-semibold mb-2', styles.emptyTitle)}>
          {emptyMessage}
        </h3>
        {emptyDescription && (
          <p className={cn('text-sm max-w-md', styles.emptyDescription)}>
            {emptyDescription}
          </p>
        )}
      </div>
    )
  }

  const renderContent = () => {
    if (viewMode === 'list') {
      return (
        <div className={cn('space-y-3', listClassName)}>
          {data.map((item, index) => (
            <div
              key={index}
              className={animateItems ? 'animate-in fade-in-0 slide-in-from-left-2 duration-300' : ''}
              style={animateItems ? { animationDelay: `${index * 50}ms` } : undefined}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      )
    }

    const renderCardFn = renderCard || renderItem
    return (
      <div
        className={cn(
          'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
          cardClassName
        )}
      >
        {data.map((item, index) => (
          <div
            key={index}
            className={animateItems ? 'animate-in fade-in-0 zoom-in-95 duration-300' : ''}
            style={animateItems ? { animationDelay: `${index * 75}ms` } : undefined}
          >
            {renderCardFn(item, index)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)} data-testid="data-view">
      {/* Toggle vue */}
      {onViewModeChange && (
        <div className="flex items-center justify-between">
          <div className={cn(
            'text-sm font-medium text-kara-primary-dark/60',
            'animate-in fade-in-0 duration-300'
          )}>
            {data.length} {data.length === 1 ? 'élément' : 'éléments'}
          </div>
          
          <div className={cn('inline-flex', styles.toggle)}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onViewModeChange('list')}
              className={cn(
                'h-8 px-3 rounded-lg gap-2',
                'transition-all duration-200',
                viewMode === 'list' ? styles.toggleActive : styles.toggleInactive
              )}
              aria-label="Vue liste"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-medium">Liste</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onViewModeChange('cards')}
              className={cn(
                'h-8 px-3 rounded-lg gap-2',
                'transition-all duration-200',
                viewMode === 'cards' ? styles.toggleActive : styles.toggleInactive
              )}
              aria-label="Vue cards"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-medium">Cards</span>
            </Button>
          </div>
        </div>
      )}

      {/* Contenu */}
      {renderContent()}
    </div>
  )
}
