'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { VehicleInsurance, VehicleInsuranceListResult } from '@/types/types'
import { VehicleInsuranceBadge } from './VehicleInsuranceBadge'
import { Eye, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import MembershipPagination from '@/components/memberships/MembershipPagination'

interface Props {
  data?: VehicleInsuranceListResult
  isLoading: boolean
  onView: (insurance: VehicleInsurance) => void
  onEdit: (insurance: VehicleInsurance) => void
  onRenew: (insurance: VehicleInsurance) => void
  onDelete: (insurance: VehicleInsurance) => void
  onPageChange: (page: number) => void
  onItemsPerPageChange: (limit: number) => void
}

export function VehicleInsuranceTable({ data, isLoading, onView, onEdit, onRenew, onDelete, onPageChange, onItemsPerPageChange }: Props) {
  const paginationInfo = data
    ? {
        currentPage: data.page,
        totalPages: Math.max(1, Math.ceil(data.total / data.limit)),
        totalItems: data.total,
        itemsPerPage: data.limit,
        hasNextPage: data.hasNextPage,
        hasPrevPage: data.hasPrevPage,
      }
    : undefined

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Véhicule</TableHead>
                <TableHead>Assurance</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Validité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                [...Array(5)].map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))}

              {!isLoading && data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                    Aucun dossier assurance trouvé.
                  </TableCell>
                </TableRow>
              )}

              {data?.items.map(item => (
                <TableRow key={item.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {item.memberFirstName} {item.memberLastName}
                      </p>
                      <p className="text-sm text-gray-500">{item.memberMatricule || 'Matricule inconnu'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.vehicleBrand} {item.vehicleModel}
                      </p>
                      <p className="text-sm text-gray-500">
                        {item.vehicleType} • {item.plateNumber}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">{item.insuranceCompany}</p>
                      <p className="text-sm text-gray-500">{item.policyNumber}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-gray-900">
                      {item.premiumAmount.toLocaleString('fr-FR')} {item.currency}
                    </p>
                    <p className="text-xs text-gray-500">Couverture {item.coverageType || 'N/A'}</p>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-700">
                      <p>Du {item.startDate.toLocaleDateString('fr-FR')}</p>
                      <p>Au {item.endDate.toLocaleDateString('fr-FR')}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <VehicleInsuranceBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => onView(item)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onRenew(item)}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => onDelete(item)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {paginationInfo && (
          <div className="border-t p-4">
            <MembershipPagination pagination={paginationInfo} onPageChange={onPageChange} onItemsPerPageChange={onItemsPerPageChange} isLoading={isLoading} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

