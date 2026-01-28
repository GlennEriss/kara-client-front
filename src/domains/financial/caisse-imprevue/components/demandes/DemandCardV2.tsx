/**
 * Composant Card pour afficher une demande (vue Grid)
 * 
 * Responsive : Mobile (pleine largeur), Tablette/Desktop (grille)
 */

'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreVertical, User, Phone, DollarSign, Calendar, Eye, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { CaisseImprevueDemand } from '../../entities/demand.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { usePrefetchDemandDetail } from '../../hooks/useDemandDetail'

interface DemandCardV2Props {
  demand: CaisseImprevueDemand
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

export function DemandCardV2({
  demand,
  onViewDetails,
  onAccept,
  onReject,
  onReopen,
  onDelete,
  onEdit,
  onCreateContract,
  className,
}: DemandCardV2Props) {
  const statusInfo = statusConfig[demand.status] || statusConfig.PENDING
  const createdAt = demand.createdAt instanceof Date ? demand.createdAt : new Date(demand.createdAt)
  const prefetchDetail = usePrefetchDemandDetail()

  return (
    <Card
      className={cn('hover:shadow-lg transition-shadow', className)}
      data-testid={`demand-card-${demand.id}`}
      onMouseEnter={() => prefetchDetail(demand.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={statusInfo.variant} className={cn('text-xs', statusInfo.color)}>
                {statusInfo.label}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-kara-neutral-500" />
                <span className="font-semibold text-sm md:text-base">
                  {demand.memberFirstName} {demand.memberLastName}
                </span>
              </div>
              {demand.memberPhone && (
                <div className="flex items-center gap-2 text-sm text-kara-neutral-600">
                  <Phone className="w-4 h-4" />
                  <span>{demand.memberPhone}</span>
                </div>
              )}
            </div>
          </div>
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
              {demand.status === 'PENDING' || demand.status === 'REOPENED' ? (
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
              ) : null}
              {demand.status === 'REJECTED' && onReopen && (
                <DropdownMenuItem onClick={() => onReopen(demand.id)}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Réouvrir
                </DropdownMenuItem>
              )}
              {demand.status === 'APPROVED' && onCreateContract && (
                <DropdownMenuItem onClick={() => onCreateContract(demand.id)}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Créer contrat
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(demand.id)}>
                  Modifier
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={() => onDelete(demand.id)} className="text-red-600">
                  Supprimer
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="w-4 h-4 text-kara-neutral-500" />
          <span>
            {demand.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA/
            {demand.paymentFrequency === 'DAILY' ? 'jour' : 'mois'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-kara-neutral-500" />
          <span>{demand.subscriptionCIDuration} mois</span>
        </div>
        <div className="text-xs text-kara-neutral-500 pt-2 border-t">
          Créée le {format(createdAt, 'dd MMM yyyy à HH:mm', { locale: fr })}
        </div>
      </CardContent>
    </Card>
  )
}
