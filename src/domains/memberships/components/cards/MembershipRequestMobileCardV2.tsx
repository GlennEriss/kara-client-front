/**
 * Card mobile pour une demande d'adhésion V2
 * 
 * Suit WIREFRAME_UI.md section 5.4 : Vue Mobile (Cards)
 * Affiche les informations critiques pour le traitement sur mobile
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { MembershipRequest } from '../../entities'
import { 
  StatusBadgeV2, 
  PaymentBadgeV2, 
  RelativeDateV2,
  CorrectionBannerV2,
} from '../shared'
import { MembershipRequestActionsV2 } from '../actions'
import { User, Phone, Mail } from 'lucide-react'

interface MembershipRequestMobileCardV2Props {
  request: MembershipRequest
  onViewDetails?: (id: string) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onRequestCorrections?: (id: string) => void
  onPay?: (id: string) => void
  onViewMembershipForm?: (id: string) => void
  onViewIdDocument?: (id: string) => void
  onSendWhatsApp?: (id: string) => void
  
  // États de chargement
  loadingActions?: Record<string, boolean>
  
  className?: string
}

/**
 * Convertit un timestamp Firestore en Date de manière sécurisée
 */
function toDateSafe(value: any): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (value && typeof value.toDate === 'function') return value.toDate()
  if (typeof value === 'string') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

export function MembershipRequestMobileCardV2({
  request,
  onViewDetails,
  onApprove,
  onReject,
  onRequestCorrections,
  onPay,
  onViewMembershipForm,
  onViewIdDocument,
  onSendWhatsApp,
  loadingActions = {},
  className,
}: MembershipRequestMobileCardV2Props) {
  const { 
    id, 
    identity, 
    status, 
    isPaid, 
    createdAt,
    reviewNote,
  } = request

  const fullName = `${identity.firstName || ''} ${identity.lastName || ''}`.trim() || 'N/A'
  const initials = `${identity.firstName?.[0] || ''}${identity.lastName?.[0] || ''}`.toUpperCase()
  const phoneNumber = identity.contacts?.[0] || ''
  const email = identity.email || ''

  return (
    <Card
      className={cn(
        'border-gray-200 hover:shadow-lg transition-all duration-200',
        reviewNote && 'border-amber-200 bg-amber-50/30',
        className
      )}
      data-testid="membership-request-mobile-card"
    >
      <CardContent className="p-4 space-y-4">
        {/* Header : Photo + Nom */}
        <div className="flex items-start gap-3">
          <Avatar className="w-16 h-16 border-2 border-gray-200 shrink-0">
            <AvatarImage 
              src={identity.photoURL || undefined} 
              alt={fullName}
              className="object-cover"
            />
            <AvatarFallback className="bg-kara-primary-dark/10 text-kara-primary-dark text-sm font-semibold">
              {initials || <User className="w-8 h-8" />}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <h3 className="font-semibold text-base text-kara-primary-dark truncate">
                {fullName}
              </h3>
              {/* Traçabilité : Matricule et ID (P0.3) */}
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                {request.matricule && (
                  <span className="font-mono" title={`Matricule: ${request.matricule}`}>
                    #{request.matricule}
                  </span>
                )}
                {request.id && (
                  <span className="font-mono text-[10px]" title={`ID: ${request.id}`}>
                    {request.id.slice(0, 8)}...
                  </span>
                )}
              </div>
            </div>

            {/* Badges : Statut + Paiement - Avec labels pour clarté */}
            <div className="flex items-start gap-3 flex-wrap">
              <StatusBadgeV2 status={status} showLabel={true} />
              <PaymentBadgeV2 isPaid={isPaid || false} showLabel={true} />
            </div>
          </div>
        </div>

        {/* Informations de contact */}
        {(phoneNumber || email) && (
          <div className="flex flex-col gap-2 text-sm text-gray-600">
            {phoneNumber && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="truncate">{phoneNumber}</span>
              </div>
            )}
            {email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="truncate">{email}</span>
              </div>
            )}
          </div>
        )}

        {/* Date de soumission */}
        {createdAt && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <RelativeDateV2 
              date={toDateSafe(createdAt) || new Date()} 
              showIcon={true}
            />
          </div>
        )}

        {/* Bandeau de corrections */}
        {reviewNote && (
          <CorrectionBannerV2 reviewNote={reviewNote} />
        )}

        {/* Actions */}
        <div className="pt-2 border-t border-gray-200">
          <MembershipRequestActionsV2
            requestId={id || ''}
            status={status}
            isPaid={isPaid || false}
            onApprove={onApprove ? () => onApprove(id || '') : undefined}
            onReject={onReject ? () => onReject(id || '') : undefined}
            onRequestCorrections={onRequestCorrections ? () => onRequestCorrections(id || '') : undefined}
            onPay={onPay ? () => onPay(id || '') : undefined}
            onViewDetails={onViewDetails ? () => onViewDetails(id || '') : undefined}
            onViewMembershipForm={onViewMembershipForm ? () => onViewMembershipForm(id || '') : undefined}
            onViewIdDocument={onViewIdDocument ? () => onViewIdDocument(id || '') : undefined}
            onSendWhatsApp={onSendWhatsApp ? () => onSendWhatsApp(id || '') : undefined}
            isApproving={loadingActions?.[`approve-${id}`]}
            isRejecting={loadingActions?.[`reject-${id}`]}
            isRequestingCorrections={loadingActions?.[`corrections-${id}`]}
            isPaying={loadingActions?.[`pay-${id}`]}
            className="flex-wrap"
          />
        </div>
      </CardContent>
    </Card>
  )
}
