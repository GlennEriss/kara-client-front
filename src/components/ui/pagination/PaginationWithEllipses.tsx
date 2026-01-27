'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationWithEllipsesProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  hasNextPage?: boolean
  hasPrevPage?: boolean
  isLoading?: boolean
  className?: string
  compact?: boolean // Mode compact pour le header
}

/**
 * Composant de pagination avec système d'ellipses intelligent
 * Affiche : première page, 3 pages autour de la page courante, dernière page, avec ellipses
 * Exemple : 1 ... 4 5 6 ... 30 (si on est à la page 5)
 */
export function PaginationWithEllipses({
  currentPage,
  totalPages,
  onPageChange,
  hasNextPage = true,
  hasPrevPage = true,
  isLoading = false,
  className,
  compact = false,
}: PaginationWithEllipsesProps) {
  if (totalPages <= 1) return null

  // Générer les numéros de page à afficher avec ellipses
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = []
    
    // Si moins de 7 pages, afficher toutes
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
      return pages
    }

    // Toujours afficher la première page
    pages.push(1)

    // Calculer la plage autour de la page courante (3 pages : page-1, page, page+1)
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)

    // Si il y a un gap entre la première page et la plage, ajouter ellipsis
    if (start > 2) {
      pages.push('ellipsis')
    }

    // Ajouter les pages dans la plage
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    // Si il y a un gap entre la plage et la dernière page, ajouter ellipsis
    if (end < totalPages - 1) {
      pages.push('ellipsis')
    }

    // Toujours afficher la dernière page (si différente de la première)
    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return pages
  }

  const pageNumbers = getPageNumbers()
  const isOnFirstPage = currentPage <= 1
  const isOnLastPage = currentPage >= totalPages

  if (compact) {
    // Mode compact : seulement les boutons précédent/suivant et le numéro de page
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrevPage || isLoading || isOnFirstPage}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-kara-primary-dark px-2">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage || isLoading || isOnLastPage}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Mode complet : tous les boutons de page avec ellipses
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrevPage || isLoading || isOnFirstPage}
        className="h-9 w-9 p-0 border-kara-neutral-200 text-kara-primary-dark hover:bg-kara-primary-dark hover:text-white hover:border-kara-primary-dark transition-all disabled:opacity-40"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-1">
        {pageNumbers.map((pageNum, index) => {
          if (pageNum === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-kara-neutral-400 text-sm"
              >
                ...
              </span>
            )
          }

          return (
            <Button
              key={pageNum}
              variant={pageNum === currentPage ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              disabled={isLoading}
              className={cn(
                'h-9 w-9 p-0 font-semibold text-sm transition-all duration-200',
                pageNum === currentPage
                  ? 'bg-kara-primary-dark text-white shadow-md'
                  : 'bg-white border border-kara-neutral-200 text-kara-neutral-600 hover:bg-kara-primary-dark/10 hover:text-kara-primary-dark hover:border-kara-primary-dark/30'
              )}
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
        disabled={!hasNextPage || isLoading || isOnLastPage}
        className="h-9 w-9 p-0 border-kara-neutral-200 text-kara-primary-dark hover:bg-kara-primary-dark hover:text-white hover:border-kara-primary-dark transition-all disabled:opacity-40"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  )
}
