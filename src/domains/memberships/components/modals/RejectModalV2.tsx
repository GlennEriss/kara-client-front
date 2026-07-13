/**
 * Modal de rejet V2 pour une demande d'adhésion
 * 
 * Suit les diagrammes de séquence et la logique métier
 */

'use client'

import { Dialog } from '@/components/ui/responsive-dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { XCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { MEMBERSHIP_REQUEST_VALIDATION } from '@/constantes/membership-requests'

interface RejectModalV2Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
  requestId: string
  memberName: string
  isLoading?: boolean
}

export function RejectModalV2({
  isOpen,
  onClose,
  onConfirm,
  requestId,
  memberName,
  isLoading = false,
}: RejectModalV2Props) {
  const [reason, setReason] = useState('')
  const minLength = 10
  const maxLength = MEMBERSHIP_REQUEST_VALIDATION.MAX_REJECTION_REASON_LENGTH
  const isValid = reason.trim().length >= minLength && reason.trim().length <= maxLength

  const handleConfirm = async () => {
    if (!isValid) {
      return
    }

    await onConfirm(reason.trim())
  }

  const handleClose = () => {
    if (!isLoading) {
      setReason('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <ModalContent className="w-[95vw] max-w-[95vw] sm:max-w-[500px] sm:w-full" data-testid="reject-modal">
        <ModalHeader
          icon={XCircle}
          tone="destructive"
          title={<span data-testid="reject-modal-title">Rejeter la demande d'adhésion</span>}
          description={
            <span data-testid="reject-modal-description">
              Vous êtes sur le point de rejeter la demande de{' '}
              <strong data-testid="reject-modal-member-name" className="break-words">{memberName}</strong>.
              Veuillez fournir un motif de rejet (minimum {minLength} caractères).
            </span>
          }
        />

        <ModalBody className="space-y-3 sm:space-y-4">
          {/* Motif de rejet */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-xs sm:text-sm font-semibold text-kara-primary-dark" data-testid="reject-modal-reason-label">
              Motif de rejet <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              data-testid="reject-modal-reason-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indiquez le motif de rejet de cette demande..."
              disabled={isLoading}
              rows={4}
              className="resize-none text-sm min-h-[100px] sm:min-h-[120px]"
              maxLength={maxLength}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span
                className={cn(
                  reason.trim().length > 0 && reason.trim().length < minLength && 'text-amber-600'
                )}
                data-testid="reject-modal-reason-counter"
              >
                {reason.trim().length > 0 && reason.trim().length < minLength
                  ? `Minimum ${minLength} caractères requis`
                  : `${reason.trim().length} / ${maxLength} caractères`}
              </span>
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full sm:w-auto border-gray-300 text-sm"
            data-testid="reject-modal-cancel-button"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !isValid}
            variant="destructive"
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white text-sm"
            data-testid="reject-modal-submit-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" data-testid="reject-modal-loading" />
                <span className="hidden sm:inline">Rejet en cours...</span>
                <span className="sm:hidden">En cours...</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Rejeter
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
