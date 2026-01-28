/**
 * Modal d'acceptation d'une demande Caisse Imprévue V2
 * 
 * Responsive : Mobile, Tablette, Desktop
 * Validation : Raison obligatoire (min 10 caractères)
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
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface AcceptDemandModalV2Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
  demandId: string
  memberName: string
  isLoading?: boolean
}

const MIN_REASON_LENGTH = 10
const MAX_REASON_LENGTH = 500

export function AcceptDemandModalV2({
  isOpen,
  onClose,
  onConfirm,
  demandId,
  memberName,
  isLoading = false,
}: AcceptDemandModalV2Props) {
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
        data-testid="accept-demand-modal"
      >
        <DialogHeader>
          <DialogTitle
            className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-lg sm:text-xl font-bold text-kara-primary-dark"
            data-testid="accept-demand-modal-title"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
              <span className="break-words">Accepter la demande</span>
            </div>
          </DialogTitle>
          <DialogDescription
            className="text-xs sm:text-sm text-gray-600 mt-2"
            data-testid="accept-demand-modal-description"
          >
            Vous êtes sur le point d'accepter la demande de{' '}
            <strong data-testid="accept-demand-modal-member-name" className="break-words">
              {memberName}
            </strong>
            . Veuillez fournir une raison d'acceptation (minimum {MIN_REASON_LENGTH} caractères).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-2 sm:py-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="accept-reason" className="text-sm font-medium">
              Raison d'acceptation <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="accept-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indiquez la raison d'acceptation de cette demande..."
              className={cn(
                'min-h-[100px] resize-none',
                reason.trim().length > 0 &&
                  reason.trim().length < MIN_REASON_LENGTH &&
                  'border-amber-500 focus-visible:ring-amber-500'
              )}
              disabled={isLoading}
              data-testid="accept-demand-reason-textarea"
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
            data-testid="accept-demand-modal-cancel"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            data-testid="accept-demand-modal-confirm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Acceptation en cours...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Accepter
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
