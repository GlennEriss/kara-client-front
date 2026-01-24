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
import { User, CheckCircle2, Calendar } from 'lucide-react'

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

  // Actions post-rejet (si status === 'rejected')
  onReopen?: (id: string) => void
  onDelete?: (id: string) => void
  onSendWhatsAppRejection?: (id: string) => void

  onViewMembershipForm?: (id: string) => void
  onViewApprovedMembershipPdf?: (id: string) => void
  onViewIdDocument?: (id: string) => void
  onViewPaymentDetails?: (id: string) => void
  onExportPDF?: (id: string) => void
  onExportExcel?: (id: string) => void
  onSendWhatsApp?: (id: string) => void
  onEdit?: (id: string) => void // Nouvelle action pour modifier

  // Actions corrections (si status === 'under_review')
  onCopyCorrectionLink?: (id: string) => void
  onSendWhatsAppCorrection?: (id: string) => void
  onRenewSecurityCode?: (id: string) => void

  // Pour obtenir les infos de l'admin qui a approuvé
  getApprovedByInfo?: (requestId: string) => { name?: string; matricule?: string } | null

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
  onReopen,
  onDelete,
  onSendWhatsAppRejection,
  onViewMembershipForm,
  onViewApprovedMembershipPdf,
  onViewIdDocument,
  onViewPaymentDetails,
  onExportPDF,
  onExportExcel,
  onSendWhatsApp,
  onEdit,
  onCopyCorrectionLink,
  onSendWhatsAppCorrection,
  onRenewSecurityCode,
  getApprovedByInfo,
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
    approvedBy,
    approvedAt,
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
          {/* Traçabilité : Matricule uniquement avec # (P0.3) */}
          {matricule && (
            <span className="text-[10px] text-gray-400 truncate" title={`Matricule: ${matricule}`}>
              #{matricule}
            </span>
          )}
          {/* Informations d'approbation (si approuvé) */}
          {status === 'approved' && (approvedBy || approvedAt) && (
            <div className="flex flex-col gap-0.5 mt-1">
              {approvedBy && getApprovedByInfo && (
                <div className="flex items-center gap-1 text-[10px] text-green-600">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="truncate">
                    Approuvé par: {getApprovedByInfo(id || '')?.name || approvedBy}
                  </span>
                </div>
              )}
              {approvedAt && (
                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span className="truncate">
                    {toDateSafe(approvedAt)?.toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) || 'Date inconnue'}
                  </span>
                </div>
              )}
            </div>
          )}
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
          onReopen={onReopen ? () => onReopen(id || '') : undefined}
          onDelete={onDelete ? () => onDelete(id || '') : undefined}
          onSendWhatsAppRejection={onSendWhatsAppRejection ? () => onSendWhatsAppRejection(id || '') : undefined}
          onViewDetails={onViewDetails ? () => onViewDetails(id || '') : undefined}
          onViewMembershipForm={onViewMembershipForm ? () => onViewMembershipForm(id || '') : undefined}
          onViewApprovedMembershipPdf={onViewApprovedMembershipPdf ? () => onViewApprovedMembershipPdf(id || '') : undefined}
          onViewIdDocument={onViewIdDocument ? () => onViewIdDocument(id || '') : undefined}
          onViewPaymentDetails={onViewPaymentDetails ? () => onViewPaymentDetails(id || '') : undefined}
          onExportPDF={onExportPDF ? () => onExportPDF(id || '') : undefined}
          onExportExcel={onExportExcel ? () => onExportExcel(id || '') : undefined}
          onSendWhatsApp={onSendWhatsApp ? () => onSendWhatsApp(id || '') : undefined}
          onEdit={onEdit ? () => onEdit(id || '') : undefined}
          onCopyCorrectionLink={onCopyCorrectionLink ? () => onCopyCorrectionLink(id || '') : undefined}
          onSendWhatsAppCorrection={onSendWhatsAppCorrection ? () => onSendWhatsAppCorrection(id || '') : undefined}
          onRenewSecurityCode={onRenewSecurityCode ? () => onRenewSecurityCode(id || '') : undefined}
          isApproving={loadingActions[`approve-${id}`]}
          isRejecting={loadingActions[`reject-${id}`]}
          isRequestingCorrections={loadingActions[`corrections-${id}`]}
          isPaying={loadingActions[`pay-${id}`]}
          isReopening={loadingActions[`reopen-${id}`]}
          isDeleting={loadingActions[`delete-${id}`]}
          isRenewingCode={loadingActions[`renew-code-${id}`]}
        />
      </td>
    </tr>
  )
}
