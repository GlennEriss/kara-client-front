'use client'

import { Card, CardContent } from '@/components/ui/card'
import MembershipPagination from '@/components/memberships/MembershipPagination'
import type { PaginatedMembers } from '@/db/member.db'

interface MembershipsListPaginationProps {
  pagination: PaginatedMembers['pagination']
  isLoading: boolean
  onPageChange: (page: number) => void
  onItemsPerPageChange: (itemsPerPage: number) => void
}

export function MembershipsListPagination({
  pagination,
  isLoading,
  onPageChange,
  onItemsPerPageChange,
}: MembershipsListPaginationProps) {
  // Toujours afficher la pagination si on a des membres, même s'il y en a moins que itemsPerPage
  // Cela permet à l'utilisateur de voir les informations de pagination et de changer itemsPerPage
  if (pagination.totalItems === 0) {
    return null
  }

  return (
    <Card className="bg-gradient-to-r from-white via-gray-50/30 to-white border-0 shadow-lg mt-6" data-testid="memberships-list-pagination">
      <CardContent className="p-4">
        <MembershipPagination
          pagination={pagination}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  )
}
