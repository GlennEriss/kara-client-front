/**
 * Badge pour afficher le statut de paiement d'une demande d'adhésion V2
 * 
 * Suit le design system KARA avec animations et couleurs du thème
 */

'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { MEMBERSHIP_REQUEST_UI_COLORS } from '@/constantes/membership-requests'
import { CheckCircle, XCircle } from 'lucide-react'

interface PaymentBadgeV2Props {
  isPaid: boolean
  className?: string
  showLabel?: boolean // Afficher le label "Paiement" au-dessus (utile pour cards, redondant dans tableau)
}

export function PaymentBadgeV2({ isPaid, className, showLabel = false }: PaymentBadgeV2Props) {
  const config = MEMBERSHIP_REQUEST_UI_COLORS.PAYMENT[isPaid ? 'paid' : 'unpaid']
  const Icon = isPaid ? CheckCircle : XCircle

  const badge = (
    <Badge
      className={cn(
        config.badge,
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full transition-all duration-200 hover:scale-105 w-fit',
        className
      )}
      title={`Paiement : ${config.label}`}
    >
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </Badge>
  )

  if (!showLabel) {
    return <div data-testid="payment-badge-container">{badge}</div>
  }

  return (
    <div className="inline-flex flex-col gap-0.5" data-testid="payment-badge-container">
      <span className="text-[10px] font-medium text-kara-neutral-500 uppercase tracking-wide">
        Paiement
      </span>
      {badge}
    </div>
  )
}
