/**
 * Composant Table pour afficher les demandes (vue Table)
 * 
 * Responsive : Mobile (scroll horizontal), Desktop (pleine largeur)
 */

'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Eye, CheckCircle2, XCircle, RotateCcw, Trash2, Edit, FileCheck } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { CaisseImprevueDemand } from '../../entities/demand.types'

interface DemandTableV2Props {
  demands: CaisseImprevueDemand[]
  onViewDetails?: (id: string) => void
  onAccept?: (id: string) => void
  onReject?: (id: string) => void
  onReopen?: (id: string) => void
  onDelete?: (id: string) => void
  onEdit?: (id: string) => void
  onCreateContract?: (id: string) => void
  className?: string
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  PENDING: { label: 'En attente', variant: 'secondary', color: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: 'Acceptée', variant: 'default', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Refusée', variant: 'destructive', color: 'bg-red-100 text-red-800' },
  CONVERTED: { label: 'Convertie', variant: 'default', color: 'bg-blue-100 text-blue-800' },
  REOPENED: { label: 'Réouverte', variant: 'secondary', color: 'bg-purple-100 text-purple-800' },
}

export function DemandTableV2({
  demands,
  onViewDetails,
  onAccept,
  onReject,
  onReopen,
  onDelete,
  onEdit,
  onCreateContract,
  className,
}: DemandTableV2Props) {
  return (
    <div className={cn('rounded-md border overflow-x-auto', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Statut</TableHead>
            <TableHead>Membre</TableHead>
            <TableHead className="hidden md:table-cell">Téléphone</TableHead>
            <TableHead className="hidden lg:table-cell">Forfait</TableHead>
            <TableHead className="hidden lg:table-cell">Montant</TableHead>
            <TableHead className="hidden md:table-cell">Date création</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {demands.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-kara-neutral-500">
                Aucune demande trouvée
              </TableCell>
            </TableRow>
          ) : (
            demands.map((demand) => {
              const statusInfo = statusConfig[demand.status] || statusConfig.PENDING
              const createdAt = demand.createdAt instanceof Date ? demand.createdAt : new Date(demand.createdAt)

              return (
                <TableRow key={demand.id} data-testid={`demand-table-row-${demand.id}`}>
                  <TableCell>
                    <Badge variant={statusInfo.variant} className={cn('text-xs', statusInfo.color)}>
                      {statusInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {demand.memberFirstName} {demand.memberLastName}
                    </div>
                    <div className="text-xs text-kara-neutral-500 md:hidden">
                      {demand.memberPhone}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {demand.memberPhone || '-'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {demand.subscriptionCICode}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {demand.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA/
                    {demand.paymentFrequency === 'DAILY' ? 'jour' : 'mois'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {format(createdAt, 'dd MMM yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onViewDetails && (
                          <DropdownMenuItem onClick={() => onViewDetails(demand.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Voir détails
                          </DropdownMenuItem>
                        )}
                        {(demand.status === 'PENDING' || demand.status === 'REOPENED') && (
                          <>
                            {onAccept && (
                              <DropdownMenuItem onClick={() => onAccept(demand.id)}>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Accepter
                              </DropdownMenuItem>
                            )}
                            {onReject && (
                              <DropdownMenuItem onClick={() => onReject(demand.id)}>
                                <XCircle className="w-4 h-4 mr-2" />
                                Refuser
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                        {demand.status === 'REJECTED' && onReopen && (
                          <DropdownMenuItem onClick={() => onReopen(demand.id)}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Réouvrir
                          </DropdownMenuItem>
                        )}
                        {demand.status === 'APPROVED' && onCreateContract && (
                          <DropdownMenuItem onClick={() => onCreateContract(demand.id)}>
                            <FileCheck className="w-4 h-4 mr-2" />
                            Créer contrat
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(demand.id)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem onClick={() => onDelete(demand.id)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
