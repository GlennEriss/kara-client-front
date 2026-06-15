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

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useMember } from '@/hooks/useMembers'
import {
    Calendar,
    CheckCircle2,
    Clock,
    Eye,
    FileSignature,
    FileText,
    MoreHorizontal,
    Pencil,
    RotateCcw,
    Trash2,
    XCircle
} from 'lucide-react'
import type { CaisseImprevueDemand } from '../../entities/demand.types'
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
  dot: string
  textColor: string
}> = {
  PENDING: {
    label: 'En attente',
    icon: <Clock className="w-3.5 h-3.5" />,
    dot: 'bg-amber-400',
    textColor: 'text-amber-700',
  },
  APPROVED: {
    label: 'Acceptée',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    dot: 'bg-green-500',
    textColor: 'text-green-700',
  },
  REJECTED: {
    label: 'Refusée',
    icon: <XCircle className="w-3.5 h-3.5" />,
    dot: 'bg-red-400',
    textColor: 'text-red-700',
  },
  CONVERTED: {
    label: 'Convertie',
    icon: <FileSignature className="w-3.5 h-3.5" />,
    dot: 'bg-emerald-500',
    textColor: 'text-emerald-700',
  },
  REOPENED: {
    label: 'Réouverte',
    icon: <RotateCcw className="w-3.5 h-3.5" />,
    dot: 'bg-blue-400',
    textColor: 'text-blue-700',
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
  const { data: member } = useMember(demand.memberId)
  const memberPhotoUrl = member?.photoURL || ''
  const memberInitials = `${(demand.memberFirstName || '')[0] || ''}${(demand.memberLastName || '')[0] || ''}`.toUpperCase()

  // Déterminer les actions disponibles selon le statut
  const canAcceptOrReject = demand.status === 'PENDING' || demand.status === 'REOPENED'
  const canReopen = demand.status === 'REJECTED'
  const canCreateContract = demand.status === 'APPROVED'

  return (
    <Card
      className={cn(
        'group flex h-full flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200',
        'hover:border-gray-200 hover:shadow-md',
        className
      )}
      data-testid={`demand-card-${demand.id}`}
      onMouseEnter={() => prefetchDetail(demand.id)}
    >
      <CardContent className="p-4 md:p-5">
        {/* Header : avatar + nom à gauche, statut dot + menu à droite */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-9 shrink-0 rounded-xl">
              {memberPhotoUrl ? (
                <AvatarImage src={memberPhotoUrl} alt={`Photo de ${demand.memberFirstName} ${demand.memberLastName}`} className="h-full w-full object-cover object-center" />
              ) : null}
              <AvatarFallback className="rounded-xl bg-[#234D65] text-[11px] font-semibold text-white">
                {memberInitials || '--'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {demand.memberFirstName} {demand.memberLastName}
              </p>
              {demand.memberPhone && (
                <p className="truncate text-xs text-gray-400">{demand.memberPhone}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className={cn('flex items-center gap-1.5 text-xs font-semibold', statusInfo.textColor)}>
              <span className={cn('h-2 w-2 rounded-full shrink-0', statusInfo.dot)} />
              {statusInfo.label}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-60 group-hover:opacity-100 transition-opacity"
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
        </div>

        {/* Stats financières */}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 mb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
              {frequencyInfo.label === 'Journalier' ? 'Par jour' : 'Mensualité'}
            </p>
            <p className="font-bold text-[#234D65] tabular-nums text-sm">
              {demand.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-gray-400">FCFA</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Durée</p>
            <p className="font-bold text-gray-900 tabular-nums text-sm">
              {demand.subscriptionCIDuration} <span className="text-[10px] font-normal text-gray-400">mois</span>
            </p>
          </div>
          {demand.subscriptionCINominal ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Nominal</p>
              <p className="font-bold text-gray-900 tabular-nums text-sm">
                {demand.subscriptionCINominal.toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-gray-400">FCFA</span>
              </p>
            </div>
          ) : null}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Fréquence</p>
            <p className="font-bold text-gray-900 text-sm">{frequencyInfo.label}</p>
          </div>
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
                  className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Accepter
                </Button>
              )}
              {onReject && (
                <Button
                  variant="outline"
                  onClick={() => onReject(demand.id)}
                  className="w-full h-9 text-xs border-red-200 text-red-600 hover:bg-red-50"
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
              className="w-full h-9 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Réouvrir la demande
            </Button>
          )}

          {canCreateContract && onCreateContract && (
            <Button
              onClick={() => onCreateContract(demand.id)}
              className="w-full h-9 bg-[#234D65] hover:bg-[#2c5a73] text-white text-sm font-semibold"
            >
              <FileSignature className="w-4 h-4 mr-2" />
              Créer le contrat
            </Button>
          )}

          {/* Bouton Voir détails toujours présent */}
          {onViewDetails && (
            <Button
              onClick={() => onViewDetails(demand.id)}
              className="w-full h-9 bg-[#234D65] hover:bg-[#2c5a73] text-white text-sm font-semibold"
            >
              <Eye className="w-4 h-4 mr-1.5" />
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
