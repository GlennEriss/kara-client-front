/**
 * Modal de refus d'une demande Caisse Imprévue V2
 * 
 * Responsive : Mobile, Tablette, Desktop
 * Validation : Motif obligatoire (min 10 caractères)
 */

'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { XCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface RejectDemandModalV2Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
  demandId: string
  memberName: string
  isLoading?: boolean
}

const MIN_REASON_LENGTH = 10
const MAX_REASON_LENGTH = 500

export function RejectDemandModalV2({
  isOpen,
  onClose,
  onConfirm,
  demandId,
  memberName,
  isLoading = false,
}: RejectDemandModalV2Props) {
  const [reason, setReason] = useState('')
  const isValid = reason.trim().length >= MIN_REASON_LENGTH && reason.trim().length <= MAX_REASON_LENGTH

  const handleConfirm = async () => {
    if (!isValid) {
      return
    }

    await onConfirm(reason.trim())
    setReason('')
  }

  const handleClose = () => {
    if (!isLoading) {
      setReason('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="w-[95vw] max-w-[95vw] sm:max-w-[500px] sm:w-full"
        data-testid="reject-demand-modal"
      >
        <DialogHeader>
          <DialogTitle
            className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-lg sm:text-xl font-bold text-kara-primary-dark"
            data-testid="reject-demand-modal-title"
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
              <span className="break-words">Refuser la demande</span>
            </div>
          </DialogTitle>
          <DialogDescription
            className="text-xs sm:text-sm text-gray-600 mt-2"
            data-testid="reject-demand-modal-description"
          >
            Vous êtes sur le point de refuser la demande de{' '}
            <strong data-testid="reject-demand-modal-member-name" className="break-words">
              {memberName}
            </strong>
            . Veuillez fournir un motif de refus (minimum {MIN_REASON_LENGTH} caractères).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-2 sm:py-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="reject-reason" className="text-sm font-medium">
              Motif de refus <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indiquez le motif de refus de cette demande..."
              className={cn(
                'min-h-[100px] resize-none',
                reason.trim().length > 0 &&
                  reason.trim().length < MIN_REASON_LENGTH &&
                  'border-amber-500 focus-visible:ring-amber-500'
              )}
              disabled={isLoading}
              data-testid="reject-demand-reason-textarea"
            />
            <div className="flex items-center justify-between text-xs">
              <span
                className={cn(
                  reason.trim().length < MIN_REASON_LENGTH
                    ? 'text-amber-600'
                    : reason.trim().length > MAX_REASON_LENGTH
                    ? 'text-red-600'
                    : 'text-gray-500'
                )}
              >
                {reason.trim().length} / {MAX_REASON_LENGTH} caractères
                {reason.trim().length > 0 && reason.trim().length < MIN_REASON_LENGTH && (
                  <span className="ml-1">(minimum {MIN_REASON_LENGTH} requis)</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
            data-testid="reject-demand-modal-cancel"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            variant="destructive"
            className="w-full sm:w-auto"
            data-testid="reject-demand-modal-confirm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Refus en cours...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Refuser
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
