/**
 * Ligne de tableau pour une demande d'adhésion V2 (Desktop)
 * 
 * Suit WIREFRAME_UI.md section 5.2 : Tableau Desktop
 * Affiche les informations critiques pour le traitement
 */

'use client'

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { MembershipRequest } from '../../entities'
import { 
  StatusBadgeV2, 
  PaymentBadgeV2, 
  RelativeDateV2 
} from '../shared'
import { MembershipRequestActionsV2 } from '../actions'
import { User } from 'lucide-react'

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

interface MembershipRequestRowV2Props {
  request: MembershipRequest
  onViewDetails?: (id: string) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onRequestCorrections?: (id: string) => void
  onPay?: (id: string) => void
  onViewMembershipForm?: (id: string) => void
  onViewIdDocument?: (id: string) => void
  onViewPaymentDetails?: (id: string) => void
  onExportPDF?: (id: string) => void
  onExportExcel?: (id: string) => void
  onSendWhatsApp?: (id: string) => void
  
  // États de chargement
  loadingActions?: Record<string, boolean>
  
  className?: string
}

export function MembershipRequestRowV2({
  request,
  onViewDetails,
  onApprove,
  onReject,
  onRequestCorrections,
  onPay,
  onViewMembershipForm,
  onViewIdDocument,
  onViewPaymentDetails,
  onExportPDF,
  onExportExcel,
  onSendWhatsApp,
  loadingActions = {},
  className,
}: MembershipRequestRowV2Props) {
  const { 
    id, 
    identity, 
    status, 
    isPaid, 
    createdAt,
    reviewNote,
    matricule,
  } = request

  const fullName = `${identity.firstName || ''} ${identity.lastName || ''}`.trim() || 'N/A'
  const initials = `${identity.firstName?.[0] || ''}${identity.lastName?.[0] || ''}`.toUpperCase()

  return (
    <tr
      className={cn(
        'border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150',
        reviewNote && 'bg-amber-50/30',
        className
      )}
      data-testid="membership-request-row"
      data-request-id={request.id}
    >
      {/* Photo */}
      <td className="px-4 py-3">
        <Avatar className="w-10 h-10 border-2 border-gray-200">
          <AvatarImage 
            src={identity.photoURL || undefined} 
            alt={fullName}
            className="object-cover"
          />
          <AvatarFallback className="bg-kara-primary-dark/10 text-kara-primary-dark text-xs font-semibold">
            {initials || <User className="w-5 h-5" />}
          </AvatarFallback>
        </Avatar>
      </td>

      {/* Nom complet */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-sm text-kara-primary-dark">
            {fullName}
          </span>
          {identity.email && (
            <span className="text-xs text-gray-500 truncate max-w-[200px]">
              {identity.email}
            </span>
          )}
          {/* Traçabilité : ID et matricule (P0.3) */}
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            {matricule && (
              <span className="truncate" title={`Matricule: ${matricule}`}>
                #{matricule}
              </span>
            )}
            {id && (
              <span className="truncate font-mono" title={`ID: ${id}`}>
                {id.slice(0, 8)}...
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Statut */}
      <td className="px-4 py-3">
        <StatusBadgeV2 status={status} />
      </td>

      {/* Paiement */}
      <td className="px-4 py-3">
        <PaymentBadgeV2 isPaid={isPaid || false} />
      </td>

      {/* Date de soumission */}
      <td className="px-4 py-3">
        {(() => {
          const date = toDateSafe(createdAt)
          return date ? (
            <RelativeDateV2 date={date} showIcon={false} />
          ) : null
        })()}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
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
          onViewPaymentDetails={onViewPaymentDetails ? () => onViewPaymentDetails(id || '') : undefined}
          onExportPDF={onExportPDF ? () => onExportPDF(id || '') : undefined}
          onExportExcel={onExportExcel ? () => onExportExcel(id || '') : undefined}
          onSendWhatsApp={onSendWhatsApp ? () => onSendWhatsApp(id || '') : undefined}
          isApproving={loadingActions[`approve-${id}`]}
          isRejecting={loadingActions[`reject-${id}`]}
          isRequestingCorrections={loadingActions[`corrections-${id}`]}
          isPaying={loadingActions[`pay-${id}`]}
        />
      </td>
    </tr>
  )
}
