/**
 * Badge pour indiquer le type de demande (Nouvelle, Résoumission, Doublon) V2
 * 
 * Prépare l'UI pour P1.2 - Gestion des doublons
 * Le backend devra fournir ces informations dans MembershipRequest
 */

'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AlertTriangle, RotateCcw, Sparkles } from 'lucide-react'

export type DuplicateType = 'new' | 'resubmission' | 'duplicate'

interface DuplicateBadgeV2Props {
  type: DuplicateType
  className?: string
}

const DUPLICATE_CONFIG = {
  new: {
    label: 'Nouvelle',
    icon: Sparkles,
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    tooltip: 'Première demande de cet utilisateur',
  },
  resubmission: {
    label: 'Résoumission',
    icon: RotateCcw,
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    tooltip: 'Nouvelle demande après rejet/correction',
  },
  duplicate: {
    label: 'Doublon',
    icon: AlertTriangle,
    badge: 'bg-red-100 text-red-800 border-red-200',
    tooltip: 'Demande similaire à une demande existante',
  },
} as const

export function DuplicateBadgeV2({ type, className }: DuplicateBadgeV2Props) {
  const config = DUPLICATE_CONFIG[type]
  const Icon = config.icon

  return (
    <Badge
      className={cn(
        config.badge,
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-full transition-all duration-200 hover:scale-105 w-fit',
        className
      )}
      title={config.tooltip}
      data-testid={`duplicate-badge-${type}`}
    >
      <Icon className="w-2.5 h-2.5" />
      <span>{config.label}</span>
    </Badge>
  )
}
