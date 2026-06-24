/**
 * Vue liste des anniversaires avec grille 5 cards par ligne
 * 
 * Affiche 20 cards par page (4 lignes × 5 cards).
 * Inclut la pagination et les états vides/erreur.
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ListPagination } from '@/components/ui/list-pagination'
import { Cake } from 'lucide-react'
import { BirthdayCard } from './BirthdayCard'
import type { BirthdayMember } from '../../types/birthdays'

export interface BirthdaysListProps {
  members: BirthdayMember[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  isLoading?: boolean
  onPageChange?: (page: number) => void
  highlightedMemberId?: string
}

export function BirthdaysList({
  members,
  pagination,
  isLoading = false,
  onPageChange,
  highlightedMemberId,
}: BirthdaysListProps) {
  if (isLoading) {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        data-testid="birthdays-grid"
      >
        {Array.from({ length: 20 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="w-16 h-16 rounded-full bg-gray-200 mx-auto mb-2" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <Card>
        <CardContent className="text-center p-12">
          <Cake className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun anniversaire trouvé</h3>
          <p className="text-gray-600">
            Aucun membre ne correspond aux critères de recherche.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Grille de cards : 5 par ligne */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        data-testid="birthdays-grid"
      >
        {members.map((member) => (
          <BirthdayCard
            key={member.id}
            member={member}
            isHighlighted={highlightedMemberId === member.id}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div data-testid="member-birthdays-pagination">
          <ListPagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPrev={() => onPageChange?.(pagination.currentPage - 1)}
            onNext={() => onPageChange?.(pagination.currentPage + 1)}
            prevDisabled={!pagination.hasPrevPage || isLoading}
            nextDisabled={!pagination.hasNextPage || isLoading}
            prevTestId="pagination-prev"
            nextTestId="pagination-next"
          />
        </div>
      )}

      {/* Info total */}
      <div className="text-center text-sm text-gray-500">
        {pagination.totalItems} anniversaire{pagination.totalItems > 1 ? 's' : ''} au total
      </div>
    </div>
  )
}
