'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface ListPaginationProps {
  currentPage: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
  /** Désactivation du bouton Précédent (défaut : currentPage <= 1). */
  prevDisabled?: boolean
  /** Désactivation du bouton Suivant (défaut : currentPage >= totalPages). */
  nextDisabled?: boolean
  /** Texte récap, ex. « Affichage 1-14 sur 100 contrats ». */
  summary?: ReactNode
  className?: string
  prevTestId?: string
  nextTestId?: string
}

/**
 * Pagination de liste responsive (alignée sur la Caisse Imprévue).
 * - Mobile : récap centré, « Page X sur Y » au-dessus (anticipe les grands
 *   nombres), puis Précédent/Suivant pleine largeur.
 * - Desktop : récap à gauche, « Précédent · Page X sur Y · Suivant » à droite.
 *
 * À placer dans un Card/CardContent existant — le composant ne rend pas de Card.
 */
export function ListPagination({
  currentPage,
  totalPages,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  summary,
  className,
  prevTestId,
  nextTestId,
}: ListPaginationProps) {
  const isPrevDisabled = prevDisabled ?? currentPage <= 1
  const isNextDisabled = nextDisabled ?? currentPage >= totalPages
  const btnClass =
    'flex-1 border-[#234D65]/35 px-3 py-1 text-[#234D65] cursor-pointer hover:bg-[#234D65] hover:text-white sm:flex-none'
  const pageLabel = `Page ${currentPage} sur ${totalPages}`

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      {summary != null && (
        <div className="text-center text-sm text-gray-600 sm:text-left">{summary}</div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:ml-auto">
        {/* Mobile : indicateur de page au-dessus (anticipe « 100 sur 100 »). */}
        <span className="text-center text-sm text-gray-600 sm:hidden">{pageLabel}</span>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrev}
            disabled={isPrevDisabled}
            className={btnClass}
            data-testid={prevTestId}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Précédent
          </Button>
          {/* Desktop : indicateur de page entre les boutons. */}
          <span className="hidden whitespace-nowrap text-sm text-gray-600 sm:inline">{pageLabel}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={isNextDisabled}
            className={btnClass}
            data-testid={nextTestId}
          >
            Suivant
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
