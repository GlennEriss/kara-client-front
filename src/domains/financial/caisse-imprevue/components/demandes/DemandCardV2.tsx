/**
 * Composant Card pour afficher une demande (vue Grid)
 * 
 * Design selon WIREFRAME_LISTE.md :
 * - Badge statut en haut
 * - Infos membre (nom, téléphone)
 * - Infos financières (montant, durée, fréquence)
 * - Motif de la demande
 * - Boutons d'action visibles
 * 
 * Responsive : Mobile (boutons empilés), Tablette+ (boutons côte à côte)
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  User, 
  Phone, 
  Banknote, 
  Calendar, 
  Clock,
  Eye, 
  CheckCircle2, 
  XCircle, 
  RotateCcw,
  FileText,
  Repeat,
  CalendarDays,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileSignature
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

const statusConfig: Record<string, { 
  label: string
  icon: React.ReactNode
  bgColor: string
  textColor: string
  borderColor: string
}> = {
  PENDING: { 
    label: 'En attente', 
    icon: <Clock className="w-3.5 h-3.5" />,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200'
  },
  APPROVED: { 
    label: 'Acceptée', 
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  },
  REJECTED: { 
    label: 'Refusée', 
    icon: <XCircle className="w-3.5 h-3.5" />,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200'
  },
  CONVERTED: { 
    label: 'Convertie', 
    icon: <FileSignature className="w-3.5 h-3.5" />,
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200'
  },
  REOPENED: { 
    label: 'Réouverte', 
    icon: <RotateCcw className="w-3.5 h-3.5" />,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
}

const frequencyConfig: Record<string, { label: string; shortLabel: string }> = {
  MONTHLY: { label: 'Mensuel', shortLabel: 'mois' },
  DAILY: { label: 'Journalier', shortLabel: 'jour' },
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
  const frequencyInfo = frequencyConfig[demand.paymentFrequency] || frequencyConfig.MONTHLY
  const createdAt = demand.createdAt instanceof Date ? demand.createdAt : new Date(demand.createdAt)
  const prefetchDetail = usePrefetchDemandDetail()

  // Déterminer les actions disponibles selon le statut
  const canAcceptOrReject = demand.status === 'PENDING' || demand.status === 'REOPENED'
  const canReopen = demand.status === 'REJECTED'
  const canCreateContract = demand.status === 'APPROVED'

  return (
    <Card
      className={cn(
        'group relative overflow-hidden border-2 transition-all duration-200',
        'hover:shadow-lg hover:border-gray-300',
        statusInfo.borderColor,
        className
      )}
      data-testid={`demand-card-${demand.id}`}
      onMouseEnter={() => prefetchDetail(demand.id)}
    >
      <CardContent className="p-4 md:p-5">
        {/* Header : Badge Statut + Menu */}
        <div className="flex items-start justify-between mb-4">
          <Badge 
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 font-medium',
              statusInfo.bgColor,
              statusInfo.textColor,
              'border',
              statusInfo.borderColor
            )}
          >
            {statusInfo.icon}
            {statusInfo.label}
          </Badge>

          {/* Menu des actions secondaires */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-60 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onViewDetails && (
                <DropdownMenuItem onClick={() => onViewDetails(demand.id)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Voir détails
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(demand.id)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(demand.id)} 
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Infos Membre - Prénom puis nom sur lignes séparées */}
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex flex-col gap-0.5">
              <span className="font-semibold text-gray-900 text-base block">
                {demand.memberFirstName}
              </span>
              <span className="font-semibold text-gray-900 text-base block">
                {demand.memberLastName}
              </span>
            </div>
          </div>
          {demand.memberPhone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="break-all">{demand.memberPhone}</span>
            </div>
          )}
        </div>

        {/* Infos Financières - Montant sur une ligne, fréquence et badge sur la ligne d'en dessous */}
        <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-green-600 shrink-0" />
              <span className="font-semibold text-gray-900 text-sm sm:text-base">
                {demand.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">/{frequencyInfo.shortLabel}</span>
              <Badge variant="outline" className="text-xs font-medium bg-white w-fit">
                <Repeat className="w-3 h-3 mr-1" />
                {frequencyInfo.label}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
            <span>{demand.subscriptionCIDuration} mois de cotisation</span>
          </div>
          {demand.subscriptionCINominal && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Banknote className="w-4 h-4 text-gray-400 shrink-0" />
              <span>Nominal: {demand.subscriptionCINominal.toLocaleString('fr-FR')} FCFA</span>
            </div>
          )}
        </div>

        {/* Motif */}
        {demand.cause && (
          <div className="mb-4">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Motif</span>
                <p className="text-sm text-gray-700 line-clamp-2 mt-0.5">
                  {demand.cause}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Séparateur */}
        <div className="border-t border-gray-200 my-4" />

        {/* Boutons d'action principaux - Alignés verticalement */}
        <div className="flex flex-col gap-2">
          {/* Actions selon le statut */}
          {canAcceptOrReject && (
            <>
              {onAccept && (
                <Button
                  onClick={() => onAccept(demand.id)}
                  className="w-full h-11 text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Accepter
                </Button>
              )}
              {onReject && (
                <Button
                  variant="outline"
                  onClick={() => onReject(demand.id)}
                  className="w-full h-11 text-sm font-medium border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Refuser
                </Button>
              )}
            </>
          )}

          {canReopen && onReopen && (
            <Button
              variant="outline"
              onClick={() => onReopen(demand.id)}
              className="w-full h-11 text-sm font-medium border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Réouvrir la demande
            </Button>
          )}

          {canCreateContract && onCreateContract && (
            <Button
              onClick={() => onCreateContract(demand.id)}
              className="w-full h-11 text-sm font-medium bg-[#234D65] hover:bg-[#2c5a73] text-white"
            >
              <FileSignature className="w-4 h-4 mr-2" />
              Créer le contrat
            </Button>
          )}

          {/* Bouton Voir détails toujours présent */}
          {onViewDetails && (
            <Button
              variant="ghost"
              onClick={() => onViewDetails(demand.id)}
              className="w-full h-11 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Eye className="w-4 h-4 mr-2" />
              Voir les détails
            </Button>
          )}
        </div>

        {/* Date de création */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100">
          <Calendar className="w-3.5 h-3.5" />
          <span>Créée le {format(createdAt, "d MMMM yyyy 'à' HH:mm", { locale: fr })}</span>
        </div>
      </CardContent>
    </Card>
  )
}
