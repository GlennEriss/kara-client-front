'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { VehicleInsurance, VehicleInsuranceListResult } from '@/types/types'
import { VehicleInsuranceBadge } from './VehicleInsuranceBadge'
import { Eye, Pencil, RefreshCw, Trash2, Phone, MapPin } from 'lucide-react'
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

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  car: 'Voiture',
  motorcycle: 'Moto',
  truck: 'Camion',
  bus: 'Bus',
  maison: 'Maison',
  other: 'Autre',
}

const ENERGY_LABELS: Record<string, string> = {
  essence: 'Essence',
  diesel: 'Diesel',
  electrique: 'Électrique',
  hybride: 'Hybride',
  gaz: 'Gaz',
  autre: 'Autre',
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

              {data?.items.map(item => {
                const holderFirstName = (item.holderType === 'member' ? item.memberFirstName : item.nonMemberFirstName) || ''
                const holderLastName = (item.holderType === 'member' ? item.memberLastName : item.nonMemberLastName) || ''
                const holderLabel = item.holderType === 'member' ? 'Membre KARA' : 'Non-membre'
                const holderReference = item.holderType === 'member' ? (item.memberMatricule || 'Matricule inconnu') : 'Externe'
                const phone = item.primaryPhone || item.memberContacts?.[0] || item.nonMemberPhone1 || ''
                const city = item.city || ''
                const vehicleTypeLabel = VEHICLE_TYPE_LABELS[item.vehicleType] || item.vehicleType
                const energyLabel = item.energySource ? (ENERGY_LABELS[item.energySource] || item.energySource) : ''
                return (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-900">
                          {holderFirstName} {holderLastName}
                        </p>
                        <p className="text-xs uppercase tracking-wide text-gray-500">{holderLabel}</p>
                        <p className="text-sm text-gray-500">{holderReference}</p>
                        {city && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {city}
                          </p>
                        )}
                        {phone && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.vehicleBrand} {item.vehicleModel}
                        </p>
                        <p className="text-sm text-gray-500">
                          {vehicleTypeLabel} • {item.plateNumber}
                        </p>
                        {(energyLabel || item.fiscalPower) && (
                          <p className="text-xs text-gray-500">
                            {energyLabel}
                            {energyLabel && item.fiscalPower ? ' • ' : ''}
                            {item.fiscalPower}
                          </p>
                        )}
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
                      <p className="text-xs text-gray-500">
                        {item.warrantyMonths ? `${item.warrantyMonths} mois de garantie` : 'Durée non renseignée'}
                      </p>
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
                )
              })}
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

