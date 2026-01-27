'use client'

import { Card, CardContent } from '@/components/ui/card'
import { PaginationWithEllipses } from '@/components/ui/pagination/PaginationWithEllipses'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users } from 'lucide-react'
import type { PaginatedMembers } from '@/db/member.db'

interface MembershipsListPaginationProps {
  pagination: PaginatedMembers['pagination']
  isLoading: boolean
  onPageChange: (page: number) => void
  onItemsPerPageChange: (itemsPerPage: number) => void
  compact?: boolean // Mode compact pour le header
}

export function MembershipsListPagination({
  pagination,
  isLoading,
  onPageChange,
  onItemsPerPageChange,
  compact = false,
}: MembershipsListPaginationProps) {
  // Toujours afficher la pagination si on a des membres, même s'il y en a moins que itemsPerPage
  // Cela permet à l'utilisateur de voir les informations de pagination et de changer itemsPerPage
  if (pagination.totalItems === 0) {
    return null
  }

  // Calculer l'index de début et de fin pour l'affichage
  const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage + 1
  const endIndex = Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)

  if (compact) {
    // Mode compact pour le header
    return (
      <div className="flex items-center gap-3">
        <PaginationWithEllipses
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
          hasNextPage={pagination.hasNextPage}
          hasPrevPage={pagination.hasPrevPage}
          isLoading={isLoading}
          compact={true}
        />
      </div>
    )
  }

  // Mode complet pour le bas
  return (
    <Card className="bg-gradient-to-r from-white via-gray-50/30 to-white border-0 shadow-lg mt-6" data-testid="memberships-list-pagination">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          {/* Informations sur les résultats */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>
              Affichage de <span className="font-medium">{startIndex}</span> à{' '}
              <span className="font-medium">{endIndex}</span> sur{' '}
              <span className="font-medium">{pagination.totalItems}</span> membres
            </span>
          </div>

          {/* Contrôles de pagination */}
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
            {/* Sélecteur du nombre d'éléments par page */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Afficher</span>
              <Select
                value={pagination.itemsPerPage.toString()}
                onValueChange={(value) => onItemsPerPageChange(parseInt(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">par page</span>
            </div>

            {/* Pagination avec ellipses */}
            {pagination.totalPages > 1 && (
              <PaginationWithEllipses
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={onPageChange}
                hasNextPage={pagination.hasNextPage}
                hasPrevPage={pagination.hasPrevPage}
                isLoading={isLoading}
                compact={false}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
