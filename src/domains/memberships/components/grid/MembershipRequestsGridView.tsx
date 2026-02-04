/**
 * Vue Grid pour les demandes d'adhésion
 * Affiche 4 demandes par ligne sur desktop, 2 sur tablette, 1 sur mobile
 */

'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MembershipRequest } from '../../entities'
import {
  StatusBadgeV2,
  PaymentBadgeV2,
  RelativeDateV2,
} from '../shared'
import { MembershipRequestActionsV2 } from '../actions'
import { Phone, Mail, Users, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Eye, FileText, MessageSquare, Edit, IdCard, CreditCard, Download, FileSpreadsheet, CheckCircle2, XCircle, FileEdit, RotateCcw, Trash2, Upload } from 'lucide-react'
import type { MembershipRequestStatus } from '@/types/types'
import { formatNamePairs } from '../../utils/formatNamePairs'

// Composant helper pour le dropdown d'actions (même logique que MembershipRequestActionsV2)
interface MembershipRequestActionsDropdownProps {
  requestId: string
  status: MembershipRequestStatus
  isPaid: boolean
  onApprove?: () => void
  onReject?: () => void
  onRequestCorrections?: () => void
  onPay?: () => void
  onReopen?: () => void
  onDelete?: () => void
  onSendWhatsAppRejection?: () => void
  onViewDetails?: () => void
  onViewMembershipForm?: () => void
  onViewApprovedMembershipPdf?: () => void
  onReplaceAdhesionPdf?: () => void
  onViewIdDocument?: () => void
  onViewPaymentDetails?: () => void
  onExportPDF?: () => void
  onExportExcel?: () => void
  onSendWhatsApp?: () => void
  onEdit?: () => void
  isApproving?: boolean
  isApproved?: boolean
  isRejecting?: boolean
  isRequestingCorrections?: boolean
  isPaying?: boolean
  isReopening?: boolean
  isDeleting?: boolean
}

function MembershipRequestActionsDropdown({
  requestId: _requestId,
  status,
  isPaid,
  onApprove,
  onReject,
  onRequestCorrections,
  onPay,
  onReopen,
  onDelete,
  onSendWhatsAppRejection,
  onViewDetails,
  onViewMembershipForm,
  onViewApprovedMembershipPdf,
  onReplaceAdhesionPdf,
  onViewIdDocument,
  onViewPaymentDetails,
  onExportPDF,
  onExportExcel,
  onSendWhatsApp,
  onEdit,
  isApproving = false,
  isRejecting = false,
  isRequestingCorrections = false,
  isPaying = false,
  isReopening = false,
  isDeleting = false,
  isApproved: isApprovedProp,
}: MembershipRequestActionsDropdownProps) {
  // Même logique que MembershipRequestActionsV2
  const isRejected = status === 'rejected'
  const canPay = !isRejected && status === 'pending' && !isPaid
  const canApprove = !isRejected && status === 'pending' && isPaid
  const canReject = !isRejected && (status === 'pending' || status === 'under_review')
  const canRequestCorrections = !isRejected && status === 'pending'
  const primaryAction = canPay && onPay ? 'pay' : canApprove && onApprove ? 'approve' : null
  const isApproved = isApprovedProp ?? status === 'approved'
  const isUnderReview = status === 'under_review'

  // Vérifier s'il y a des actions à afficher dans le menu
  const hasMenuActions =
    onViewMembershipForm ||
    onViewIdDocument ||
    (isApproved && isPaid && onReplaceAdhesionPdf) ||
    (onViewPaymentDetails && isPaid) ||
    onExportPDF ||
    onExportExcel ||
    (onSendWhatsApp && !isRejected) ||
    (!isUnderReview && (
      !isRejected && (
        (canPay && !primaryAction) ||
        (canApprove && !primaryAction) ||
        canRequestCorrections ||
        canReject
      ) ||
      (onViewDetails && !primaryAction && !isApproved)
    )) ||
    onEdit ||
    (isRejected && (onReopen || onSendWhatsAppRejection || onDelete))

  if (!hasMenuActions) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 flex-shrink-0"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Actions critiques (desktop uniquement) */}
        {!isUnderReview && (
          <>
            {canPay && !primaryAction && onPay && (
              <DropdownMenuItem
                onClick={onPay}
                disabled={isPaying}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {isPaying ? 'Paiement...' : 'Payer'}
              </DropdownMenuItem>
            )}

            {canApprove && !primaryAction && onApprove && (
              <DropdownMenuItem
                onClick={onApprove}
                disabled={isApproving}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isApproving ? 'Approbation...' : 'Approuver'}
              </DropdownMenuItem>
            )}

            {canRequestCorrections && onRequestCorrections && (
              <DropdownMenuItem
                onClick={onRequestCorrections}
                disabled={isRequestingCorrections}
              >
                <FileEdit className="w-4 h-4 mr-2" />
                {isRequestingCorrections ? 'Envoi...' : 'Demander corrections'}
              </DropdownMenuItem>
            )}

            {canReject && onReject && (
              <DropdownMenuItem
                onClick={onReject}
                disabled={isRejecting}
                className="text-red-600"
              >
                <XCircle className="w-4 h-4 mr-2" />
                {isRejecting ? 'Rejet...' : 'Rejeter'}
              </DropdownMenuItem>
            )}

            {(canPay || canApprove || canRequestCorrections || canReject) && (
              <DropdownMenuSeparator />
            )}

            {onViewDetails && !primaryAction && !isApproved && (
              <DropdownMenuItem onClick={onViewDetails}>
                <Eye className="w-4 h-4 mr-2" />
                Voir détails
              </DropdownMenuItem>
            )}

            {onEdit && !isApproved && (
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </DropdownMenuItem>
            )}
          </>
        )}

        {/* Actions rares */}
        {onViewMembershipForm && (
          <DropdownMenuItem onClick={onViewMembershipForm}>
            <FileText className="w-4 h-4 mr-2" />
            Fiche d'adhésion
          </DropdownMenuItem>
        )}

        {onViewIdDocument && (
          <DropdownMenuItem onClick={onViewIdDocument}>
            <IdCard className="w-4 h-4 mr-2" />
            Pièce d'identité
          </DropdownMenuItem>
        )}

        {isApproved && isPaid && onReplaceAdhesionPdf && (
          <DropdownMenuItem onClick={onReplaceAdhesionPdf}>
            <Upload className="w-4 h-4 mr-2" />
            Remplacer le PDF d&apos;adhésion
          </DropdownMenuItem>
        )}

        {onViewPaymentDetails && isPaid && (
          <DropdownMenuItem onClick={onViewPaymentDetails}>
            <CreditCard className="w-4 h-4 mr-2" />
            Détails paiement
          </DropdownMenuItem>
        )}

        {/* Actions post-rejet */}
        {isRejected && (
          <>
            {(onViewMembershipForm || onViewIdDocument || (onViewPaymentDetails && isPaid)) && (
              <DropdownMenuSeparator />
            )}
            {onReopen && (
              <DropdownMenuItem
                onClick={onReopen}
                disabled={isReopening}
                className="text-blue-600"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isReopening ? 'Réouverture...' : 'Réouvrir'}
              </DropdownMenuItem>
            )}

            {onSendWhatsAppRejection && (
              <DropdownMenuItem
                onClick={onSendWhatsAppRejection}
                className="text-green-600"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Envoyer WhatsApp (rejet)
              </DropdownMenuItem>
            )}

            {onDelete && (
              <DropdownMenuItem
                onClick={onDelete}
                disabled={isDeleting}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </DropdownMenuItem>
            )}
          </>
        )}

        {onExportPDF && (
          <>
            {(onViewMembershipForm || onViewIdDocument || (onViewPaymentDetails && isPaid) || (isRejected && (onReopen || onSendWhatsAppRejection || onDelete))) && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuItem onClick={onExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Exporter PDF
            </DropdownMenuItem>
          </>
        )}

        {onExportExcel && (
          <DropdownMenuItem onClick={onExportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exporter Excel
          </DropdownMenuItem>
        )}

        {onSendWhatsApp && !isUnderReview && !isRejected && (
          <>
            {(onExportPDF || onExportExcel) && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuItem
              onClick={onSendWhatsApp}
              className="text-green-600"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Envoyer via WhatsApp
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface MembershipRequestsGridViewProps {
  requests: MembershipRequest[]
  isLoading?: boolean
  onViewDetails?: (id: string) => void
  onApprove?: (request: MembershipRequest) => void
  onReject?: (request: MembershipRequest) => void
  onRequestCorrections?: (request: MembershipRequest) => void
  onPay?: (request: MembershipRequest) => void
  onReopen?: (request: MembershipRequest) => void
  onDelete?: (request: MembershipRequest) => void
  onSendWhatsAppRejection?: (request: MembershipRequest) => void
  onViewMembershipForm?: (id: string) => void
  onViewApprovedMembershipPdf?: (id: string) => void
  onReplaceAdhesionPdf?: (request: MembershipRequest) => void
  onViewIdentityDocument?: (id: string) => void
  onViewPaymentDetails?: (id: string) => void
  onExportPDF?: (id: string) => void
  onExportExcel?: (id: string) => void
  onSendWhatsApp?: (id: string) => void
  onEdit?: (id: string) => void
  onCopyCorrectionLink?: (id: string) => void
  onSendWhatsAppCorrection?: (id: string) => void
  onRenewSecurityCode?: (id: string) => void
  getProcessedByInfo?: (requestId: string) => { name?: string; matricule?: string } | null
  getApprovedByInfo?: (requestId: string) => { name?: string; matricule?: string } | null
  loadingActions?: Record<string, boolean>
  className?: string
}

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

export function MembershipRequestsGridView({
  requests,
  isLoading = false,
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
  onReplaceAdhesionPdf,
  onViewIdentityDocument,
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
}: MembershipRequestsGridViewProps) {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-kara-neutral-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-kara-neutral-200 rounded w-3/4" />
                  <div className="h-3 bg-kara-neutral-200 rounded w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-kara-primary-dark/5 flex items-center justify-center">
          <Users className="w-10 h-10 text-kara-primary-dark/30" />
        </div>
        <h3 className="font-bold text-kara-primary-dark mb-2">Aucune demande trouvée</h3>
        <p className="text-kara-neutral-500 text-sm">Ajustez vos filtres ou attendez de nouvelles demandes.</p>
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {requests.map((request) => {
        const createdAt = toDateSafe(request.createdAt)
        const firstName = request.identity?.firstName || ''
        const lastName = request.identity?.lastName || ''
        const fullName = `${firstName} ${lastName}`.trim() || 'Sans nom'
        const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || '?'
        const email = request.identity?.email || ''
        const phone = request.identity?.contacts?.[0] || ''

        return (
          <Card
            key={request.id}
            className="hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-[#CBB171]/50 h-full flex flex-col"
          >
            <CardHeader className="pb-3">
              <div className="space-y-3">
                {/* Première ligne : Avatar + Menu dropdown */}
                <div className="flex items-center justify-between">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-[#224D62]/20 flex-shrink-0">
                    <AvatarImage src={request.identity?.photoURL ?? undefined} alt={fullName} />
                    <AvatarFallback className="bg-[#224D62] text-white font-semibold text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Menu actions - toujours à droite (dernier bouton) - Utilise le dropdown de MembershipRequestActionsV2 */}
                  <MembershipRequestActionsDropdown
                    requestId={request.id || ''}
                    status={request.status}
                    isPaid={request.isPaid || false}
                    onApprove={onApprove ? () => onApprove(request) : undefined}
                    onReject={onReject ? () => onReject(request) : undefined}
                    onRequestCorrections={onRequestCorrections ? () => onRequestCorrections(request) : undefined}
                    onPay={onPay ? () => onPay(request) : undefined}
                    onReopen={onReopen ? () => onReopen(request) : undefined}
                    onDelete={onDelete ? () => onDelete(request) : undefined}
                    onSendWhatsAppRejection={onSendWhatsAppRejection ? () => onSendWhatsAppRejection(request) : undefined}
                    onViewDetails={onViewDetails ? () => onViewDetails(request.id) : undefined}
                    onViewMembershipForm={onViewMembershipForm ? () => onViewMembershipForm(request.id) : undefined}
                    onViewApprovedMembershipPdf={onViewApprovedMembershipPdf ? () => onViewApprovedMembershipPdf(request.id) : undefined}
                    onReplaceAdhesionPdf={onReplaceAdhesionPdf ? () => onReplaceAdhesionPdf(request) : undefined}
                    onViewIdDocument={onViewIdentityDocument ? () => onViewIdentityDocument(request.id) : undefined}
                    onViewPaymentDetails={onViewPaymentDetails ? () => onViewPaymentDetails(request.id) : undefined}
                    onExportPDF={onExportPDF ? () => onExportPDF(request.id) : undefined}
                    onExportExcel={onExportExcel ? () => onExportExcel(request.id) : undefined}
                    onSendWhatsApp={onSendWhatsApp ? () => onSendWhatsApp(request.id) : undefined}
                    onEdit={onEdit ? () => onEdit(request.id) : undefined}
                    isApproving={loadingActions[`approve-${request.id}`]}
                    isRejecting={loadingActions[`reject-${request.id}`]}
                    isRequestingCorrections={loadingActions[`corrections-${request.id}`]}
                  isPaying={loadingActions[`pay-${request.id}`]}
                  isReopening={loadingActions[`reopen-${request.id}`]}
                  isDeleting={loadingActions[`delete-${request.id}`]}
                  />
                </div>

                {/* Nom et Prénom divisés en paires de 2 mots */}
                <div className="space-y-1">
                  {/* Nom divisé en paires */}
                  {formatNamePairs(lastName).map((namePair, index) => (
                    <h3
                      key={`lastname-${index}`}
                      className="font-semibold text-gray-900 text-sm sm:text-base leading-tight"
                    >
                      <span className="block truncate" title={lastName || ''}>
                        {namePair}
                      </span>
                    </h3>
                  ))}

                  {/* Prénom divisé en paires */}
                  {formatNamePairs(firstName).map((namePair, index) => (
                    <h3
                      key={`firstname-${index}`}
                      className="font-semibold text-gray-900 text-sm sm:text-base leading-tight"
                    >
                      <span className="block truncate" title={firstName || ''}>
                        {namePair}
                      </span>
                    </h3>
                  ))}
                </div>

                {/* Quatrième ligne : Statuts */}
                <div className="flex flex-wrap gap-2 items-center">
                  <StatusBadgeV2 status={request.status} />
                  <PaymentBadgeV2 isPaid={request.isPaid || false} />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-3 flex-1 flex flex-col">
              {/* Cinquième ligne et suivantes : Informations de contact */}
              <div className="space-y-2">
                {email && (
                  <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate" title={email}>{email}</span>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                    <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">{phone}</span>
                  </div>
                )}
                {createdAt && (
                  <div className="text-xs text-gray-500">
                    <RelativeDateV2 date={createdAt} />
                  </div>
                )}
              </div>

              {/* Actions - Boutons un par ligne */}
              <div className="pt-2 space-y-2 mt-auto">
                <MembershipRequestActionsV2
                  requestId={request.id || ''}
                  status={request.status}
                  isPaid={request.isPaid || false}
                  onApprove={onApprove ? () => onApprove(request) : undefined}
                  onReject={onReject ? () => onReject(request) : undefined}
                  onRequestCorrections={onRequestCorrections ? () => onRequestCorrections(request) : undefined}
                  onPay={onPay ? () => onPay(request) : undefined}
                  onReopen={onReopen ? () => onReopen(request) : undefined}
                  onDelete={onDelete ? () => onDelete(request) : undefined}
                  onSendWhatsAppRejection={onSendWhatsAppRejection ? () => onSendWhatsAppRejection(request) : undefined}
                  onViewDetails={onViewDetails ? () => onViewDetails(request.id) : undefined}
                  onViewMembershipForm={onViewMembershipForm ? () => onViewMembershipForm(request.id) : undefined}
                  onViewApprovedMembershipPdf={onViewApprovedMembershipPdf ? () => onViewApprovedMembershipPdf(request.id) : undefined}
                  onReplaceAdhesionPdf={onReplaceAdhesionPdf ? () => onReplaceAdhesionPdf(request) : undefined}
                  onViewIdDocument={onViewIdentityDocument ? () => onViewIdentityDocument(request.id) : undefined}
                  onViewPaymentDetails={onViewPaymentDetails ? () => onViewPaymentDetails(request.id) : undefined}
                  onExportPDF={onExportPDF ? () => onExportPDF(request.id) : undefined}
                  onExportExcel={onExportExcel ? () => onExportExcel(request.id) : undefined}
                  onSendWhatsApp={onSendWhatsApp ? () => onSendWhatsApp(request.id) : undefined}
                  onEdit={onEdit ? () => onEdit(request.id) : undefined}
                  onCopyCorrectionLink={onCopyCorrectionLink ? () => onCopyCorrectionLink(request.id) : undefined}
                  onSendWhatsAppCorrection={onSendWhatsAppCorrection ? () => onSendWhatsAppCorrection(request.id) : undefined}
                  onRenewSecurityCode={onRenewSecurityCode ? () => onRenewSecurityCode(request.id) : undefined}
                  isApproving={loadingActions[`approve-${request.id}`]}
                  isRejecting={loadingActions[`reject-${request.id}`]}
                  isRequestingCorrections={loadingActions[`corrections-${request.id}`]}
                  isPaying={loadingActions[`pay-${request.id}`]}
                  isReopening={loadingActions[`reopen-${request.id}`]}
                  isDeleting={loadingActions[`delete-${request.id}`]}
                  className="flex-col items-stretch w-full space-y-2"
                  hideDropdown={true}
                />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
