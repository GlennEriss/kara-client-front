'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Composant de pagination standardisé et réutilisable
 * Design système KARA avec animations modernes
 * 
 * Features :
 * - Navigation avec boutons animés
 * - Numéros de pages avec ellipses
 * - Sélecteur d'items par page
 * - Variantes de style (default, kara, minimal)
 * - Animations fluides
 */

type PaginationVariant = 'default' | 'kara' | 'minimal'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (limit: number) => void
  itemsPerPageOptions?: number[]
  showInfo?: boolean
  showItemsPerPage?: boolean
  isLoading?: boolean
  className?: string
  infoLabel?: string
  variant?: PaginationVariant
}

const DEFAULT_ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

const variantStyles: Record<PaginationVariant, {
  container: string
  info: string
  button: string
  buttonActive: string
  buttonDisabled: string
  select: string
}> = {
  default: {
    container: '',
    info: 'text-gray-600',
    button: cn(
      'border-gray-200 hover:bg-gray-100 hover:border-gray-300',
      'transition-all duration-200'
    ),
    buttonActive: 'bg-kara-primary-dark hover:bg-kara-primary-dark/90 text-white border-kara-primary-dark',
    buttonDisabled: 'opacity-50 cursor-not-allowed',
    select: 'border-gray-200',
  },
  kara: {
    container: '',
    info: 'text-kara-primary-dark/70',
    button: cn(
      'border-2 border-kara-primary-dark/20 bg-white',
      'hover:border-kara-primary-dark hover:bg-kara-primary-dark/5',
      'hover:shadow-md hover:-translate-y-0.5',
      'active:translate-y-0 active:shadow-sm',
      'transition-all duration-200 ease-out'
    ),
    buttonActive: cn(
      'bg-gradient-to-r from-kara-primary-dark to-kara-secondary-dark',
      'hover:from-kara-secondary-dark hover:to-kara-primary-dark',
      'text-white border-transparent shadow-lg shadow-kara-primary-dark/25',
      'hover:shadow-xl hover:shadow-kara-primary-dark/30',
      'hover:-translate-y-0.5'
    ),
    buttonDisabled: 'opacity-40 cursor-not-allowed hover:transform-none hover:shadow-none',
    select: 'border-2 border-kara-primary-dark/20 focus:border-kara-primary-dark',
  },
  minimal: {
    container: '',
    info: 'text-gray-500',
    button: cn(
      'border-0 hover:bg-gray-100',
      'transition-colors duration-200'
    ),
    buttonActive: 'bg-kara-primary-dark hover:bg-kara-primary-dark/90 text-white',
    buttonDisabled: 'opacity-50 cursor-not-allowed',
    select: 'border-0 bg-gray-100',
  },
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = DEFAULT_ITEMS_PER_PAGE_OPTIONS,
  showInfo = true,
  showItemsPerPage = true,
  isLoading = false,
  className,
  infoLabel = 'résultats',
  variant = 'kara',
}: PaginationProps) {
  const styles = variantStyles[variant]
  
  const startIndex = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems)

  const getPageNumbers = () => {
    const delta = 2
    const pages: number[] = []

    if (totalPages === 0) return pages
    pages.push(1)
    if (totalPages === 1) return pages

    const start = Math.max(2, currentPage - delta)
    const end = Math.min(totalPages - 1, currentPage + delta)

    if (start > 2) pages.push(-1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < totalPages - 1) pages.push(-1)
    if (totalPages > 1) pages.push(totalPages)

    return pages
  }

  const pageNumbers = getPageNumbers()
  const hasPrevPage = currentPage > 1
  const hasNextPage = currentPage < totalPages

  if (totalPages === 0 && totalItems === 0) return null

  return (
    <div
      className={cn(
        'flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0',
        'animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
        styles.container,
        className
      )}
      data-testid="pagination"
    >
      {/* Informations */}
      {showInfo && (
        <div className={cn('flex items-center space-x-2 text-sm font-medium', styles.info)}>
          <span>
            {totalItems > 0 ? (
              <>
                Affichage de{' '}
                <span className="font-bold text-kara-primary-dark">{startIndex}</span>
                {' '}à{' '}
                <span className="font-bold text-kara-primary-dark">{endIndex}</span>
                {' '}sur{' '}
                <span className="font-bold text-kara-primary-dark">{totalItems}</span>
                {' '}{infoLabel}
              </>
            ) : (
              `Aucun ${infoLabel} trouvé`
            )}
          </span>
        </div>
      )}

      {/* Contrôles */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
        {/* Items par page */}
        {showItemsPerPage && onItemsPerPageChange && (
          <div className="flex items-center space-x-2">
            <span className={cn('text-sm', styles.info)}>Afficher</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => onItemsPerPageChange(parseInt(value))}
              disabled={isLoading}
            >
              <SelectTrigger className={cn('w-20 h-9', styles.select)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemsPerPageOptions.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className={cn('text-sm', styles.info)}>par page</span>
          </div>
        )}

        {/* Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={!hasPrevPage || isLoading}
              className={cn('h-9 w-9 p-0', styles.button, !hasPrevPage && styles.buttonDisabled)}
              aria-label="Première page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!hasPrevPage || isLoading}
              className={cn('h-9 w-9 p-0', styles.button, !hasPrevPage && styles.buttonDisabled)}
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Numéros de page */}
            <div className="flex items-center space-x-1">
              {pageNumbers.map((pageNum, index) => {
                if (pageNum === -1) {
                  return (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-2 text-kara-primary-dark/40 select-none"
                      aria-hidden="true"
                    >
                      •••
                    </span>
                  )
                }

                const isActive = pageNum === currentPage

                return (
                  <Button
                    key={pageNum}
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    disabled={isLoading}
                    className={cn(
                      'h-9 w-9 p-0 font-semibold',
                      isActive ? styles.buttonActive : styles.button,
                      'transition-all duration-200'
                    )}
                    aria-label={`Page ${pageNum}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasNextPage || isLoading}
              className={cn('h-9 w-9 p-0', styles.button, !hasNextPage && styles.buttonDisabled)}
              aria-label="Page suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={!hasNextPage || isLoading}
              className={cn('h-9 w-9 p-0', styles.button, !hasNextPage && styles.buttonDisabled)}
              aria-label="Dernière page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
