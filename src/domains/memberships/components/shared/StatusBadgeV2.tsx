/**
 * Badge pour afficher le statut d'une demande d'adhésion V2
 * 
 * Suit le design system KARA avec animations et couleurs du thème
 */

'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { MEMBERSHIP_REQUEST_UI_COLORS, MEMBERSHIP_REQUEST_STATUS_LABELS } from '@/constantes/membership-requests'
import type { MembershipRequestStatus } from '@/types/types'
import { Clock, CheckCircle, XCircle, FileSearch } from 'lucide-react'

interface StatusBadgeV2Props {
  status: MembershipRequestStatus
  className?: string
  showLabel?: boolean // Afficher le label "Dossier" au-dessus (utile pour cards, redondant dans tableau)
}

const STATUS_ICONS = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  under_review: FileSearch,
} as const

export function StatusBadgeV2({ status, className, showLabel = false }: StatusBadgeV2Props) {
  const config = MEMBERSHIP_REQUEST_UI_COLORS.STATUS[status]
  const Icon = STATUS_ICONS[status]

  const badge = (
    <Badge
      className={cn(
        config.badge,
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full transition-all duration-200 hover:scale-105 w-fit',
        className
      )}
      title={`Statut dossier : ${config.label}`}
    >
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </Badge>
  )

  if (!showLabel) {
    return <div data-testid="status-badge-container">{badge}</div>
  }

  return (
    <div className="inline-flex flex-col gap-0.5" data-testid="status-badge-container">
      <span className="text-[10px] font-medium text-kara-neutral-500 uppercase tracking-wide">
        Dossier
      </span>
      {badge}
    </div>
  )
}
