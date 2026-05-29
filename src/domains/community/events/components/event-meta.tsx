/**
 * Métadonnées partagées d'affichage : libellés et couleurs des statuts/types.
 */

import { Badge } from '@/components/ui/badge'
import type { EventStatus, EventType } from '../entities/event.types'

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  poll_open: 'Sondage en cours',
  location_confirmed: 'Lieu confirmé',
  completed: 'Terminé',
  cancelled: 'Annulé',
}

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  assembly: 'Assemblée',
  celebration: 'Célébration',
  training: 'Formation',
  charity: 'Action caritative',
  other: 'Autre',
}

const STATUS_BADGE_CLASS: Record<EventStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  published: 'bg-blue-100 text-blue-800 border-blue-200',
  poll_open: 'bg-amber-100 text-amber-800 border-amber-200',
  location_confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  completed: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <Badge variant="outline" className={STATUS_BADGE_CLASS[status]}>
      {EVENT_STATUS_LABEL[status]}
    </Badge>
  )
}

export function EventTypeBadge({ type }: { type: EventType }) {
  return (
    <Badge variant="outline" className="bg-white text-[#234D65] border-[#234D65]/30">
      {EVENT_TYPE_LABEL[type]}
    </Badge>
  )
}
