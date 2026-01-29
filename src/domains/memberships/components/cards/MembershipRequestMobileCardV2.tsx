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
  CorrectionsBlockV2,
} from '../shared'
import { MembershipRequestActionsV2 } from '../actions'
import { User, Phone, Mail, CheckCircle2, Calendar } from 'lucide-react'
import { formatNamePairs } from '../../utils/formatNamePairs'

interface MembershipRequestMobileCardV2Props {
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

  // Pour obtenir les infos de l'admin qui a demandé les corrections
  getProcessedByInfo?: (requestId: string) => { name?: string; matricule?: string } | null

  // Pour obtenir les infos de l'admin qui a approuvé
  getApprovedByInfo?: (requestId: string) => { name?: string; matricule?: string } | null

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
  getProcessedByInfo,
  getApprovedByInfo,
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
    matricule,
    approvedBy,
    approvedAt,
  } = request

  const firstName = identity.firstName || ''
  const lastName = identity.lastName || ''
  const fullName = `${firstName} ${lastName}`.trim() || 'N/A'
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  const phoneNumber = identity.contacts?.[0] || ''
  const email = identity.email || ''
  
  // Diviser les noms et prénoms en paires de 2 mots
  const lastNamePairs = formatNamePairs(lastName)
  const firstNamePairs = formatNamePairs(firstName)

  return (
    <Card
      className={cn(
        'border-gray-200 hover:shadow-lg transition-all duration-200',
        reviewNote && 'border-amber-200 bg-amber-50/30',
        className
      )}
      data-testid="membership-request-mobile-card"
      data-request-id={request.id}
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
            <div className="space-y-1">
              {/* Nom divisé en paires */}
              {lastNamePairs.map((namePair, index) => (
                <h3
                  key={`lastname-${index}`}
                  className="font-semibold text-base text-kara-primary-dark"
                >
                  {namePair}
                </h3>
              ))}
              
              {/* Prénom divisé en paires */}
              {firstNamePairs.map((namePair, index) => (
                <h3
                  key={`firstname-${index}`}
                  className="font-semibold text-base text-kara-primary-dark"
                >
                  {namePair}
                </h3>
              ))}
              {/* Traçabilité : Matricule uniquement avec # (P0.3) */}
              {matricule && (
                <span className="text-xs text-gray-400 mt-0.5 font-mono" title={`Matricule: ${matricule}`}>
                  #{matricule}
                </span>
              )}
              {/* Informations d'approbation (si approuvé) */}
              {status === 'approved' && (approvedBy || approvedAt) && (
                <div className="flex flex-col gap-1 mt-1">
                  {approvedBy && getApprovedByInfo && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="truncate">
                        Approuvé par: {getApprovedByInfo(id || '')?.name || approvedBy}
                      </span>
                    </div>
                  )}
                  {approvedAt && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
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

        {/* Bloc de corrections */}
        {reviewNote && request.status === 'under_review' && (
          <CorrectionsBlockV2
            reviewNote={reviewNote}
            securityCode={request.securityCode}
            securityCodeExpiry={request.securityCodeExpiry}
            requestId={request.id || ''}
            processedByName={getProcessedByInfo?.(request.id || '')?.name}
            processedByMatricule={getProcessedByInfo?.(request.id || '')?.matricule}
            onCopyLink={onCopyCorrectionLink ? () => onCopyCorrectionLink(request.id || '') : undefined}
            onSendWhatsApp={
              onSendWhatsAppCorrection && (request.identity.contacts || []).length > 0
                ? () => onSendWhatsAppCorrection(request.id || '')
                : undefined
            }
            onRenewCode={onRenewSecurityCode ? () => onRenewSecurityCode(request.id || '') : undefined}
          />
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
            isApproving={loadingActions?.[`approve-${id}`]}
            isRejecting={loadingActions?.[`reject-${id}`]}
            isRequestingCorrections={loadingActions?.[`corrections-${id}`]}
            isPaying={loadingActions?.[`pay-${id}`]}
            isReopening={loadingActions?.[`reopen-${id}`]}
            isDeleting={loadingActions?.[`delete-${id}`]}
            isRenewingCode={loadingActions?.[`renew-code-${id}`]}
            className="flex-wrap"
          />
        </div>
      </CardContent>
    </Card>
  )
}
