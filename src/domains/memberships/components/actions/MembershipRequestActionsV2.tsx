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
} from 'lucide-react'

interface MembershipRequestActionsV2Props {
  requestId: string
  status: MembershipRequestStatus
  isPaid: boolean
  
  // Actions principales
  onApprove?: () => void
  onReject?: () => void
  onRequestCorrections?: () => void
  onPay?: () => void
  
  // Actions secondaires (dans le menu dropdown)
  onViewDetails?: () => void
  onViewMembershipForm?: () => void
  onViewIdDocument?: () => void
  onSendWhatsApp?: () => void
  
  // États de chargement
  isApproving?: boolean
  isRejecting?: boolean
  isRequestingCorrections?: boolean
  isPaying?: boolean
  
  className?: string
}

export function MembershipRequestActionsV2({
  requestId,
  status,
  isPaid,
  onApprove,
  onReject,
  onRequestCorrections,
  onPay,
  onViewDetails,
  onViewMembershipForm,
  onViewIdDocument,
  onSendWhatsApp,
  isApproving = false,
  isRejecting = false,
  isRequestingCorrections = false,
  isPaying = false,
  className,
}: MembershipRequestActionsV2Props) {
  
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

  // Déterminer l'action principale (1 seule visible)
  // Priorité : Payer > Approuver > (Rien si pas d'action critique)
  const primaryAction = canPay && onPay ? 'pay' : canApprove && onApprove ? 'approve' : null

  // Vérifier s'il y a des actions secondaires à afficher dans le menu
  // Même si rejected, on garde les actions consultation (détails, fiche, pièce d'identité)
  const hasSecondaryActions = 
    !isRejected && (
      (canPay && !primaryAction) ||
      (canApprove && !primaryAction) ||
      canRequestCorrections ||
      canReject
    ) ||
    onViewDetails ||
    onViewMembershipForm ||
    onViewIdDocument ||
    (onSendWhatsApp && !isRejected) // WhatsApp seulement si pas rejeté

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

      {/* Action secondaire visible : "Voir détails" (exploite l'espace disponible) */}
      {primaryAction && onViewDetails && (
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

      {/* Menu contextuel pour toutes les autres actions - Toujours visible si actions secondaires */}
      {hasSecondaryActions && (
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
            {/* Actions critiques (si pas action principale) */}
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

            {canReject && onReject && (
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

            {(canPay || canApprove || canRequestCorrections || canReject) && (
              <DropdownMenuSeparator />
            )}

            {/* Actions consultation - "Voir détails" affiché en visuel si action principale, sinon dans menu */}
            {onViewDetails && !primaryAction && (
              <DropdownMenuItem
                onClick={onViewDetails}
                data-testid="action-view-details-menu"
              >
                <Eye className="w-4 h-4 mr-2" />
                Voir détails
              </DropdownMenuItem>
            )}

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

            {onSendWhatsApp && (
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
