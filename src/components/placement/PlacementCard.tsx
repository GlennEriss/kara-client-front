'use client'
import { ContractCardActions } from '@/components/shared/ContractCardActions'

import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { usePlacementCommissions } from '@/hooks/usePlacements'
import { useMember } from '@/hooks/useMembers'
import { cn } from '@/lib/utils'
import type { Placement } from '@/types/types'
import { roundFcfa, sumCommissionAmounts } from '@/utils/placementMoney'
import { AlertCircle, CheckCircle, DollarSign, Edit, Eye, FileText, Trash2, Upload } from 'lucide-react'

interface PlacementCardProps {
  placement: Placement
  onDetailsClick?: () => void
  onPayCommissionClick: (commissionId: string) => void
  onDeleteClick?: () => void
  onOpenClick?: () => void
  onUploadContractClick?: () => void
  onViewContractClick?: () => void
  onDownloadContractClick?: () => void
  onEditClick?: () => void
}

const STATUS_META_PLACEMENT: Record<string, { label: string; dot: string; text: string }> = {
  Draft: { label: 'Brouillon', dot: 'bg-amber-400', text: 'text-amber-700' },
  Active: { label: 'Actif', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  Closed: { label: 'Clos', dot: 'bg-blue-400', text: 'text-blue-700' },
  EarlyExit: { label: 'Sortie anticipée', dot: 'bg-red-500', text: 'text-red-700' },
  Canceled: { label: 'Annulé', dot: 'bg-gray-400', text: 'text-gray-500' },
}

const formatShortDate = (value?: Date | string | null) =>
  value ? new Date(value).toLocaleDateString('fr-FR') : '—'

export default function PlacementCard({
  placement,
  onDetailsClick,
  onPayCommissionClick,
  onDeleteClick,
  onOpenClick,
  onUploadContractClick,
  onViewContractClick,
  onDownloadContractClick,
  onEditClick,
}: PlacementCardProps) {
  const { data: commissions = [] } = usePlacementCommissions(placement.id)
  const { data: member } = useMember(placement.benefactorId)

  const nextDueCommission = commissions.find(c => c.status === 'Due')
  const payableCommissions = commissions.filter(c => c.status !== 'Canceled')
  const paidCommissionsList = payableCommissions.filter(c => c.status === 'Paid')
  const paidCommissions = paidCommissionsList.length
  const totalCommissions = payableCommissions.length
  const paidAmount = sumCommissionAmounts(paidCommissionsList)
  const nextDate = placement.nextCommissionDate || nextDueCommission?.dueDate
  const progress = totalCommissions > 0
    ? Math.min(100, Math.round((paidCommissions / totalCommissions) * 100))
    : 0

  const isOverdue = Boolean(placement.hasOverdueCommission)
  const hasContract = Boolean(placement.contractDocumentId)
  const statusMeta = STATUS_META_PLACEMENT[placement.status] ?? {
    label: placement.status,
    dot: 'bg-gray-400',
    text: 'text-gray-500',
  }
  const typeLabel = placement.payoutMode === 'MonthlyCommission_CapitalEnd' ? 'Mensuel' : 'Final'
  const displayName =
    placement.benefactorName ||
    (member ? `${member.firstName || ''} ${member.lastName || ''}`.trim() : '') ||
    placement.benefactorId.slice(0, 12)
  const initials =
    `${member?.firstName?.[0] || ''}${member?.lastName?.[0] || ''}`.toUpperCase() || 'MB'

  return (
    <Card className={cn(
      'group flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:border-gray-200 hover:shadow-md',
      isOverdue && 'border-red-200'
    )}>
      <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-5">
        {/* Header : avatar + bienfaiteur pleine largeur, statut sur sa propre
            ligne (un statut long à droite tronquait le nom). */}
        <div className="flex items-start gap-3">
          <Avatar className="size-9 shrink-0 rounded-xl">
            {member?.photoURL ? (
              <AvatarImage
                src={member.photoURL}
                alt={`Photo de ${displayName}`}
                className="h-full w-full object-cover object-center"
              />
            ) : null}
            <AvatarFallback className="rounded-xl bg-[#234D65] text-xs font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
            <p className="truncate text-xs text-gray-400">
              {placement.benefactorPhone || `#${placement.id.slice(0, 8)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={cn('flex items-center gap-1.5 text-xs font-semibold', statusMeta.text)}>
            <span className={cn('h-2 w-2 rounded-full shrink-0', statusMeta.dot)} />
            {statusMeta.label}
            {isOverdue && (
              <span className="ml-1 flex items-center gap-1 text-[10px] font-semibold text-red-600">
                <AlertCircle className="h-3 w-3" /> Retard
              </span>
            )}
          </span>
          <span className="text-[10px] font-medium text-gray-400">{typeLabel}</span>
        </div>

        {/* Stats 2×2 */}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Montant</p>
            <p className="font-bold text-[#234D65] tabular-nums text-sm">
              {roundFcfa(placement.amount || 0).toLocaleString('fr-FR')}{' '}
              <span className="text-[10px] font-normal text-gray-400">FCFA</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Taux</p>
            <p className="font-bold text-gray-900 tabular-nums text-sm">
              {placement.rate}
              <span className="text-[10px] font-normal text-gray-400">%</span>
              <span className="text-[10px] font-normal text-gray-400"> · {placement.periodMonths} mois</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Prochaine échéance</p>
            <p className="font-bold text-gray-900 tabular-nums text-sm">{formatShortDate(nextDate)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Commissions versées</p>
            <p className="font-bold text-gray-900 tabular-nums text-sm">
              {paidAmount.toLocaleString('fr-FR')}{' '}
              <span className="text-[10px] font-normal text-gray-400">FCFA</span>
            </p>
          </div>
        </div>

        {/* Progression des commissions (équivalent des mois payés en caisse) */}
        {totalCommissions > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span>Commissions payées</span>
              <span className="font-semibold text-[#234D65] tabular-nums">
                {paidCommissions} / {totalCommissions}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#234D65] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            {(placement.startDate || placement.endDate) && (
              <p className="text-[11px] text-gray-400 tabular-nums">
                Du {formatShortDate(placement.startDate)} au {formatShortDate(placement.endDate)}
              </p>
            )}
          </div>
        )}

        {/* Contact urgent — propre au placement, présenté sobrement */}
        {placement.urgentContact && (
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
              Contact urgent
            </p>
            <p className="truncate text-sm font-semibold text-gray-900">
              {placement.urgentContact.name}
              {placement.urgentContact.firstName ? ` ${placement.urgentContact.firstName}` : ''}
            </p>
            <p className="truncate text-xs text-gray-400">
              {placement.urgentContact.phone}
              {placement.urgentContact.relationship ? ` · ${placement.urgentContact.relationship}` : ''}
            </p>
          </div>
        )}

        {/* Statut du contrat, en pastille */}
        <div>
          {hasContract ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <CheckCircle className="h-3 w-3" /> Contrat déposé
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-600">
              <AlertCircle className="h-3 w-3" /> Contrat à téléverser
            </span>
          )}
        </div>

        <ContractCardActions
          contractId={placement.id}
          onOpen={onOpenClick}
          actions={[
            { id: 'info', label: 'Voir les informations', icon: Eye, onSelect: onDetailsClick, visible: placement.status === 'Active' && hasContract },
            { id: 'pay', label: nextDueCommission ? `Payer la commission — ${nextDueCommission.amount.toLocaleString('fr-FR')} FCFA` : 'Payer la commission', icon: DollarSign, onSelect: nextDueCommission ? () => onPayCommissionClick(nextDueCommission.id) : undefined, visible: placement.status === 'Active', group: 'operations' },
            { id: 'edit', label: 'Modifier le placement', icon: Edit, onSelect: onEditClick, visible: placement.status === 'Draft', group: 'operations' },
            { id: 'view', label: 'Voir le contrat signé', icon: Eye, onSelect: onViewContractClick, visible: hasContract, group: 'documents' },
            { id: 'upload', label: 'Téléverser le contrat signé', icon: Upload, onSelect: onUploadContractClick, visible: !hasContract, group: 'documents' },
            { id: 'download', label: 'Consulter le contrat PDF', icon: FileText, onSelect: onDownloadContractClick, group: 'documents' },
            { id: 'delete', label: 'Supprimer le placement', icon: Trash2, onSelect: onDeleteClick, destructive: true },
          ]}
        />
      </CardContent>
    </Card>
  )
}
