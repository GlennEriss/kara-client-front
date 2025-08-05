'use client'

import { Button } from '@/components/ui/button'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Users
} from 'lucide-react'

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface MembershipPaginationProps {
  pagination: PaginationInfo
  onPageChange: (page: number) => void
  onItemsPerPageChange: (itemsPerPage: number) => void
  isLoading?: boolean
}

const MembershipPagination = ({
  pagination,
  onPageChange,
  onItemsPerPageChange,
  isLoading = false
}: MembershipPaginationProps) => {
  const {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNextPage,
    hasPrevPage
  } = pagination

  // Calculer l'index de début et de fin pour l'affichage
  const startIndex = (currentPage - 1) * itemsPerPage + 1
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems)

  // Générer les numéros de page à afficher
  const getPageNumbers = () => {
    const delta = 2 // Nombre de pages avant et après la page courante
    const pages: number[] = []
    
    // Toujours inclure la première page
    if (totalPages > 0) {
      pages.push(1)
    }
    
    // Calculer la plage de pages autour de la page courante
    const start = Math.max(2, currentPage - delta)
    const end = Math.min(totalPages - 1, currentPage + delta)
    
    // Ajouter "..." si nécessaire après la première page
    if (start > 2) {
      pages.push(-1) // -1 représente "..."
    }
    
    // Ajouter les pages dans la plage
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    // Ajouter "..." si nécessaire avant la dernière page
    if (end < totalPages - 1) {
      pages.push(-1) // -1 représente "..."
    }
    
    // Toujours inclure la dernière page (si différente de la première)
    if (totalPages > 1) {
      pages.push(totalPages)
    }
    
    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
      {/* Informations sur les résultats */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Users className="h-4 w-4" />
        <span>
          {totalItems > 0 ? (
            <>
              Affichage de <span className="font-medium">{startIndex}</span> à{' '}
              <span className="font-medium">{endIndex}</span> sur{' '}
              <span className="font-medium">{totalItems}</span> membres
            </>
          ) : (
            'Aucun membre trouvé'
          )}
        </span>
      </div>

      {/* Contrôles de pagination */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
        {/* Sélecteur du nombre d'éléments par page */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Afficher</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => onItemsPerPageChange(parseInt(value))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
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

        {/* Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center space-x-1">
            {/* Première page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={!hasPrevPage || isLoading}
              className="h-8 w-8 p-0"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            {/* Page précédente */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!hasPrevPage || isLoading}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Numéros de page */}
            <div className="flex items-center space-x-1">
              {pageNumbers.map((pageNum, index) => {
                if (pageNum === -1) {
                  return (
                    <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                      ...
                    </span>
                  )
                }

                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    disabled={isLoading}
                    className={`h-8 w-8 p-0 ${
                      pageNum === currentPage 
                        ? 'bg-[#224D62] hover:bg-[#224D62]/90' 
                        : 'hover:bg-[#224D62]/10'
                    }`}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            {/* Page suivante */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasNextPage || isLoading}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Dernière page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={!hasNextPage || isLoading}
              className="h-8 w-8 p-0"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default MembershipPagination