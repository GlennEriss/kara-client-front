/**
 * Composant d'actions contextuelles pour une demande d'adhésion V2
 * 
 * Affiche les actions principales visibles selon le statut et le paiement
 * Suit WIREFRAME_UI.md section 4 : Actions Principales vs Secondaires
 */

'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { MembershipRequestStatus } from '@/types/types'
import {
  CheckCircle2,
  XCircle,
  FileEdit,
  CreditCard,
  MoreVertical,
  Eye,
  FileText,
  MessageSquare,
  Loader2,
  IdCard,
  RotateCcw,
  Trash2,
  Edit,
} from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface MembershipRequestActionsV2Props {
  requestId: string
  status: MembershipRequestStatus
  isPaid: boolean

  // Actions principales
  onApprove?: () => void
  onReject?: () => void
  onRequestCorrections?: () => void
  onPay?: () => void

  // Actions post-rejet (si status === 'rejected')
  onReopen?: () => void
  onDelete?: () => void
  onSendWhatsAppRejection?: () => void // Envoyer WhatsApp avec motif de rejet

  // Actions secondaires (dans le menu dropdown)
  onViewDetails?: () => void
  onViewMembershipForm?: () => void // PDF du dossier initial (généré)
  onViewApprovedMembershipPdf?: () => void // PDF uploadé lors de l'approbation (document officiel validé)
  onViewIdDocument?: () => void
  onViewPaymentDetails?: () => void // Nouvelle action pour voir les détails du paiement
  onExportPDF?: () => void // Export PDF individuel
  onExportExcel?: () => void // Export Excel individuel
  onSendWhatsApp?: () => void
  onEdit?: () => void // Modifier directement la demande (admin)

  // Actions corrections (si status === 'under_review')
  onCopyCorrectionLink?: () => void
  onSendWhatsAppCorrection?: () => void // Envoyer WhatsApp pour corrections
  onRenewSecurityCode?: () => void

  // États de chargement
  isApproving?: boolean
  isRejecting?: boolean
  isRequestingCorrections?: boolean
  isPaying?: boolean
  isRenewingCode?: boolean
  isReopening?: boolean
  isDeleting?: boolean

  className?: string
  hideDropdown?: boolean // Masquer le dropdown (utile quand le dropdown est ailleurs)
}

export function MembershipRequestActionsV2({
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
  onViewIdDocument,
  onViewPaymentDetails,
  onExportPDF,
  onExportExcel,
  onSendWhatsApp,
  onEdit,
  onCopyCorrectionLink: _onCopyCorrectionLink,
  onSendWhatsAppCorrection: _onSendWhatsAppCorrection,
  onRenewSecurityCode: _onRenewSecurityCode,
  isApproving = false,
  isRejecting = false,
  isRequestingCorrections = false,
  isPaying = false,
  isRenewingCode: _isRenewingCode = false,
  isReopening = false,
  isDeleting = false,
  className,
  hideDropdown = false,
}: MembershipRequestActionsV2Props) {
  // Détecter mobile pour adapter l'affichage
  const isMobile = useIsMobile()

  // Déterminer les actions possibles selon le workflow métier strict
  // Règles P0.1 :
  // - Payer : uniquement si pending ET non payé (dossier validé)
  // - Approuver : uniquement si pending ET payé (dossier validé + paiement)
  // - Rejeter : si pending ou under_review (pas si rejected)
  // - Corrections : si pending uniquement
  // - Rejected : toutes actions désactivées (read-only)
  const isRejected = status === 'rejected'
  const canPay = !isRejected && status === 'pending' && !isPaid
  const canApprove = !isRejected && status === 'pending' && isPaid
  const canReject = !isRejected && (status === 'pending' || status === 'under_review')
  const canRequestCorrections = !isRejected && status === 'pending'

  // Messages d'aide pour les actions désactivées (workflow métier)
  const payTooltip = isRejected
    ? 'Dossier rejeté - Aucune action possible'
    : !canPay && status === 'pending' && isPaid
      ? 'Déjà payé'
      : !canPay && status !== 'pending'
        ? 'Dossier déjà traité'
        : undefined
  const approveTooltip = isRejected
    ? 'Dossier rejeté - Aucune action possible'
    : !canApprove && status === 'pending' && !isPaid
      ? 'Payer d\'abord pour approuver'
      : !canApprove && status !== 'pending'
        ? 'Dossier déjà traité'
        : undefined
  const rejectTooltip = isRejected
    ? 'Dossier déjà rejeté'
    : undefined

  // Déterminer l'action principale (1 seule visible)
  // Priorité : Payer > Approuver > (Rien si pas d'action critique)
  const primaryAction = canPay && onPay ? 'pay' : canApprove && onApprove ? 'approve' : null

  // Vérifier si la demande est approuvée
  const isApproved = status === 'approved'

  // En mobile : afficher plus d'actions directement visibles
  // Actions fréquentes à afficher en mobile : Voir détails, Rejeter (si possible)
  const showMobileQuickActions = isMobile && !isRejected

  // Actions spécifiques pour status === 'under_review'
  // NOTE: Les actions corrections (copier lien, WhatsApp, régénérer) sont maintenant
  // dans le bloc "Corrections demandées" (CorrectionsBlockV2), pas dans le dropdown
  const isUnderReview = status === 'under_review'

  // Vérifier s'il y a des actions secondaires à afficher dans le menu
  // En mobile, le menu contient uniquement les actions rares (fiche, pièce d'identité, détails paiement, export, WhatsApp)
  // En desktop, le menu contient toutes les actions secondaires
  // NOTE: Les actions corrections ne sont plus dans le dropdown (feedback testeurs)
  // NOTE: Pour les demandes approuvées, "Voir les détails" n'est PAS dans le dropdown (déjà visible comme bouton)
  const hasMenuActions =
    onViewMembershipForm ||
    onViewIdDocument ||
    (onViewPaymentDetails && isPaid) || // Voir détails paiement si payé
    onExportPDF ||
    onExportExcel ||
    (onSendWhatsApp && !isRejected) || // WhatsApp général (pas pour corrections en mode under_review)
    (!isMobile && (
      !isRejected && (
        (canPay && !primaryAction) ||
        (canApprove && !primaryAction) ||
        canRequestCorrections ||
        (canReject && !showMobileQuickActions) // Rejeter dans menu seulement si pas affiché en mobile
      ) ||
      // Détails dans menu seulement si pas affiché en mobile ET pas approuvé (pour éviter duplication)
      (onViewDetails && !primaryAction && !isApproved)
    ))

  return (
    <div
      className={cn(
        'flex items-center gap-2 justify-start',
        className
      )}
      data-testid="membership-request-actions"
    >
      {/* Action principale - 1 seule visible selon priorité */}

      {primaryAction === 'pay' && onPay && (
        <Button
          onClick={onPay}
          disabled={isPaying || !canPay}
          size="sm"
          className="bg-kara-primary-dark hover:bg-kara-secondary-dark text-white shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="action-pay-primary"
          title={payTooltip}
        >
          {isPaying ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Paiement...
            </>
          ) : (
            <>
              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
              Payer
            </>
          )}
        </Button>
      )}

      {primaryAction === 'approve' && onApprove && (
        <Button
          onClick={onApprove}
          disabled={isApproving || !canApprove}
          size="sm"
          className="bg-kara-success hover:bg-emerald-600 text-white hover:text-white shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="action-approve-primary"
          title={approveTooltip}
        >
          {isApproving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Approbation...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Approuver
            </>
          )}
        </Button>
      )}

      {/* Actions rapides en mobile : Adhésion PDF (si approuvé) + Voir détails + Rejeter (si possible) */}
      {isMobile && (
        <>
          {/* Voir le PDF d'adhésion validé (PDF uploadé lors de l'approbation) - Visible uniquement si approuvé */}
          {isApproved && onViewApprovedMembershipPdf && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onViewApprovedMembershipPdf}
                    className="h-9 w-9 p-0 border-kara-neutral-200 text-kara-neutral-700 hover:bg-kara-neutral-50 hover:border-kara-neutral-300 hover:text-kara-primary-dark shadow-sm hover:shadow-md transition-all duration-200"
                    data-testid="action-view-approved-membership-pdf-mobile"
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>PDF</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Voir détails - Toujours visible en mobile si disponible */}
          {onViewDetails && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onViewDetails}
                    className="h-9 w-9 p-0 border-kara-neutral-200 text-kara-neutral-700 hover:bg-kara-neutral-50 hover:border-kara-neutral-300 hover:text-kara-primary-dark shadow-sm hover:shadow-md transition-all duration-200"
                    data-testid="action-view-details-mobile"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Voir les détails</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Rejeter - Visible en mobile si possible (pas si rejeté) */}
          {showMobileQuickActions && canReject && onReject && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReject}
                    disabled={isRejecting || !canReject}
                    className="h-9 w-9 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50"
                    data-testid="action-reject-mobile"
                    title={rejectTooltip}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Rejeter</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Actions post-rejet - Visible uniquement si status === 'rejected' */}
          {isRejected && (
            <>
              {/* Réouvrir - Bouton principal post-rejet */}
              {onReopen && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onReopen}
                        disabled={isReopening}
                        className="h-9 w-9 p-0 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50"
                        data-testid="reopen-button"
                        title="Réouvrir le dossier"
                      >
                        {isReopening ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Réouvrir</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Envoyer WhatsApp - Bouton WhatsApp post-rejet */}
              {onSendWhatsAppRejection && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onSendWhatsAppRejection}
                        className="h-9 w-9 p-0 border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300 hover:text-green-700 shadow-sm hover:shadow-md transition-all duration-200"
                        data-testid="send-whatsapp-button"
                        title="Envoyer le motif de rejet via WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Envoyer WhatsApp</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Supprimer - Bouton suppression post-rejet */}
              {onDelete && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onDelete}
                        disabled={isDeleting}
                        className="h-9 w-9 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50"
                        data-testid="delete-button"
                        title="Supprimer définitivement le dossier"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Supprimer</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </>
          )}
        </>
      )}

      {/* Actions principales visibles en desktop : Adhésion PDF (si approuvé) + Détails + Rejeter (si pas d'action principale ou en under_review) */}
      {!isMobile && !primaryAction && (
        <>
          {/* Voir le PDF d'adhésion validé (PDF uploadé lors de l'approbation) - Visible uniquement si approuvé */}
          {isApproved && onViewApprovedMembershipPdf && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewApprovedMembershipPdf}
              className="border-kara-neutral-200 text-kara-neutral-700 hover:bg-kara-neutral-50 hover:border-kara-neutral-300 hover:text-kara-primary-dark shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 font-medium"
              data-testid="action-view-approved-membership-pdf-visible"
              title="Ouvrir le PDF d'adhésion validé (document officiel uploadé lors de l'approbation)"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          )}

          {/* Voir détails - Toujours visible en desktop si disponible */}
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDetails}
              className="border-kara-neutral-200 text-kara-neutral-700 hover:bg-kara-neutral-50 hover:border-kara-neutral-300 hover:text-kara-primary-dark shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 font-medium"
              data-testid="action-view-details-visible"
              title="Voir les détails de la demande"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Détails</span>
            </Button>
          )}

          {/* Rejeter - Visible en desktop si possible (notamment en under_review) */}
          {canReject && onReject && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              disabled={isRejecting || !canReject}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 font-medium disabled:opacity-50"
              data-testid="action-reject-visible"
              title={rejectTooltip || 'Rejeter la demande'}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  <span className="hidden sm:inline">Rejet...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Rejeter</span>
                </>
              )}
            </Button>
          )}

          {/* Actions post-rejet - Visible uniquement si status === 'rejected' */}
          {isRejected && (
            <>
              {/* Réouvrir - Bouton principal post-rejet */}
              {onReopen && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReopen}
                  disabled={isReopening}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 font-medium disabled:opacity-50"
                  data-testid="reopen-button"
                  title="Réouvrir le dossier"
                >
                  {isReopening ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      <span className="hidden sm:inline">Réouverture...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      <span className="hidden sm:inline">Réouvrir</span>
                    </>
                  )}
                </Button>
              )}

              {/* Envoyer WhatsApp - Bouton WhatsApp post-rejet */}
              {onSendWhatsAppRejection && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSendWhatsAppRejection}
                  className="border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300 hover:text-green-700 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 font-medium"
                  data-testid="send-whatsapp-button"
                  title="Envoyer le motif de rejet via WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Envoyer WhatsApp</span>
                </Button>
              )}

              {/* Supprimer - Bouton suppression post-rejet */}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 font-medium disabled:opacity-50"
                  data-testid="delete-button"
                  title="Supprimer définitivement le dossier"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      <span className="hidden sm:inline">Suppression...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      <span className="hidden sm:inline">Supprimer</span>
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </>
      )}

      {/* Actions secondaires visibles en desktop quand action principale présente : "Adhésion PDF" (si approuvé) + "Voir détails" */}
      {!isMobile && primaryAction && (
        <>
          {/* Voir le PDF d'adhésion validé (PDF uploadé lors de l'approbation) - Visible uniquement si approuvé */}
          {isApproved && onViewApprovedMembershipPdf && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewApprovedMembershipPdf}
              className="border-kara-neutral-200 text-kara-neutral-700 hover:bg-kara-neutral-50 hover:border-kara-neutral-300 hover:text-kara-primary-dark shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 font-medium"
              data-testid="action-view-approved-membership-pdf-visible"
              title="Ouvrir le PDF d'adhésion validé (document officiel uploadé lors de l'approbation)"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Adhésion PDF</span>
            </Button>
          )}

          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDetails}
              className="border-kara-neutral-200 text-kara-neutral-700 hover:bg-kara-neutral-50 hover:border-kara-neutral-300 hover:text-kara-primary-dark shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 font-medium"
              data-testid="action-view-details-visible"
              title="Voir les détails de la demande"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Détails</span>
            </Button>
          )}
        </>
      )}

      {/* Menu contextuel pour les actions rares (mobile) ou toutes actions secondaires (desktop) */}
      {hasMenuActions && !hideDropdown && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-kara-neutral-200 text-kara-neutral-600 hover:bg-kara-neutral-50 hover:border-kara-neutral-300 transition-all duration-200 shadow-sm hover:shadow-md"
              data-testid="action-menu"
              title="Plus d'actions"
            >
              <MoreVertical className="w-4 h-4" />
              <span className="sr-only">Plus d'actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* Actions critiques (desktop uniquement - en mobile elles sont visibles) */}
            {/* NOTE: Les actions corrections (copier lien, WhatsApp, régénérer) sont maintenant
                dans le bloc "Corrections demandées" (CorrectionsBlockV2), pas dans le dropdown */}
            {/* En mode under_review, on n'affiche que les documents dans le dropdown (feedback testeurs) */}
            {!isMobile && !isUnderReview && (
              <>
                {canPay && !primaryAction && onPay && (
                  <DropdownMenuItem
                    onClick={onPay}
                    disabled={isPaying}
                    data-testid="action-pay-menu"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {isPaying ? 'Paiement...' : 'Payer'}
                  </DropdownMenuItem>
                )}

                {canApprove && !primaryAction && onApprove && (
                  <DropdownMenuItem
                    onClick={onApprove}
                    disabled={isApproving}
                    data-testid="action-approve-menu"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {isApproving ? 'Approbation...' : 'Approuver'}
                  </DropdownMenuItem>
                )}

                {canRequestCorrections && onRequestCorrections && (
                  <DropdownMenuItem
                    onClick={onRequestCorrections}
                    disabled={isRequestingCorrections}
                    data-testid="action-request-corrections-menu"
                  >
                    <FileEdit className="w-4 h-4 mr-2" />
                    {isRequestingCorrections ? 'Envoi...' : 'Demander corrections'}
                  </DropdownMenuItem>
                )}

                {/* Rejeter dans dropdown seulement si pas affiché directement (pas en under_review) */}
                {canReject && onReject && !isUnderReview && (
                  <DropdownMenuItem
                    onClick={onReject}
                    disabled={isRejecting}
                    className="text-kara-error"
                    data-testid="action-reject-menu"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {isRejecting ? 'Rejet...' : 'Rejeter'}
                  </DropdownMenuItem>
                )}

                {(canPay || canApprove || canRequestCorrections || (canReject && !isUnderReview)) && (
                  <DropdownMenuSeparator />
                )}

                {/* Actions consultation desktop - "Voir détails" dans menu si pas action principale et pas under_review et pas approuvé (pour éviter duplication) */}
                {onViewDetails && !primaryAction && !isUnderReview && !isApproved && (
                  <DropdownMenuItem
                    onClick={onViewDetails}
                    data-testid="action-view-details-menu"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Voir détails
                  </DropdownMenuItem>
                )}

                {/* Modifier (Admin) */}
                {onEdit && !isApproved && (
                  <DropdownMenuItem
                    onClick={onEdit}
                    data-testid="action-edit-menu"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                )}
              </>
            )}

            {/* Actions rares - Toujours dans le menu (mobile et desktop) */}
            {isMobile && (canRequestCorrections || canReject) && (
              <>
                {canRequestCorrections && onRequestCorrections && (
                  <DropdownMenuItem
                    onClick={onRequestCorrections}
                    disabled={isRequestingCorrections}
                    data-testid="action-request-corrections-menu"
                  >
                    <FileEdit className="w-4 h-4 mr-2" />
                    {isRequestingCorrections ? 'Envoi...' : 'Demander corrections'}
                  </DropdownMenuItem>
                )}

                {canReject && onReject && !showMobileQuickActions && (
                  <DropdownMenuItem
                    onClick={onReject}
                    disabled={isRejecting}
                    className="text-kara-error"
                    data-testid="action-reject-menu"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {isRejecting ? 'Rejet...' : 'Rejeter'}
                  </DropdownMenuItem>
                )}

                {(canRequestCorrections || canReject) && (
                  <DropdownMenuSeparator />
                )}
              </>
            )}

            {/* Fiche d'adhésion dans le dropdown - Toujours disponible comme accès alternatif, même si visible comme bouton */}
            {onViewMembershipForm && (
              <DropdownMenuItem
                onClick={onViewMembershipForm}
                data-testid="action-view-membership-form-menu"
              >
                <FileText className="w-4 h-4 mr-2" />
                Fiche d'adhésion
              </DropdownMenuItem>
            )}

            {onViewIdDocument && (
              <DropdownMenuItem
                onClick={onViewIdDocument}
                data-testid="action-view-id-document-menu"
              >
                <IdCard className="w-4 h-4 mr-2" />
                Pièce d'identité
              </DropdownMenuItem>
            )}

            {onViewPaymentDetails && isPaid && (
              <DropdownMenuItem
                onClick={onViewPaymentDetails}
                data-testid="action-view-payment-details-menu"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Voir les détails du paiement
              </DropdownMenuItem>
            )}

            {/* Actions post-rejet dans le dropdown */}
            {isRejected && (
              <>
                {onReopen && (
                  <DropdownMenuItem
                    onClick={onReopen}
                    disabled={isReopening}
                    className="text-blue-600"
                    data-testid="reopen-button"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {isReopening ? 'Réouverture...' : 'Réouvrir'}
                  </DropdownMenuItem>
                )}

                {onSendWhatsAppRejection && (
                  <DropdownMenuItem
                    onClick={onSendWhatsAppRejection}
                    className="text-green-600"
                    data-testid="send-whatsapp-button"
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
                    data-testid="delete-button"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? 'Suppression...' : 'Supprimer'}
                  </DropdownMenuItem>
                )}

                {(onReopen || onSendWhatsAppRejection || onDelete) && (
                  <DropdownMenuSeparator />
                )}
              </>
            )}

            {onSendWhatsApp && !isUnderReview && !isRejected && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onSendWhatsApp}
                  className="text-green-600"
                  data-testid="action-send-whatsapp-menu"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Envoyer via WhatsApp
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
