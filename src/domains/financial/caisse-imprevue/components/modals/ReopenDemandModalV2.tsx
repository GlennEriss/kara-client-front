/**
 * Modal de réouverture d'une demande refusée Caisse Imprévue V2
 * 
 * Responsive : Mobile, Tablette, Desktop
 * Validation : Motif optionnel (max 500 caractères)
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
import { RotateCcw, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ReopenDemandModalV2Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason?: string) => Promise<void>
  demandId: string
  memberName: string
  previousRejectReason?: string
  isLoading?: boolean
}

const MAX_REASON_LENGTH = 500

export function ReopenDemandModalV2({
  isOpen,
  onClose,
  onConfirm,
  demandId,
  memberName,
  previousRejectReason,
  isLoading = false,
}: ReopenDemandModalV2Props) {
  const [reason, setReason] = useState('')
  const isValid = reason.trim().length <= MAX_REASON_LENGTH

  const handleConfirm = async () => {
    if (!isValid) {
      return
    }

    await onConfirm(reason.trim() || undefined)
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
        data-testid="reopen-demand-modal"
      >
        <DialogHeader>
          <DialogTitle
            className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-lg sm:text-xl font-bold text-kara-primary-dark"
            data-testid="reopen-demand-modal-title"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
              <span className="break-words">Réouvrir la demande</span>
            </div>
          </DialogTitle>
          <DialogDescription
            className="text-xs sm:text-sm text-gray-600 mt-2"
            data-testid="reopen-demand-modal-description"
          >
            Vous êtes sur le point de réouvrir la demande de{' '}
            <strong data-testid="reopen-demand-modal-member-name" className="break-words">
              {memberName}
            </strong>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-2 sm:py-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {/* Motif de rejet initial */}
          {previousRejectReason && (
            <div className="space-y-2 rounded-lg bg-red-50 p-3 sm:p-4">
              <div className="text-xs sm:text-sm">
                <span className="font-semibold text-gray-700">Motif de rejet initial :</span>
                <div className="mt-1 text-gray-800 break-words" data-testid="reopen-demand-previous-reason">
                  {previousRejectReason}
                </div>
              </div>
            </div>
          )}

          {/* Motif de réouverture (optionnel) */}
          <div className="space-y-2">
            <Label htmlFor="reopen-reason" className="text-sm font-medium">
              Motif de réouverture (optionnel)
            </Label>
            <Textarea
              id="reopen-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indiquez le motif de réouverture (optionnel)..."
              className={cn(
                'min-h-[100px] resize-none',
                reason.trim().length > MAX_REASON_LENGTH && 'border-red-500 focus-visible:ring-red-500'
              )}
              disabled={isLoading}
              data-testid="reopen-demand-reason-textarea"
            />
            <div className="flex items-center justify-between text-xs">
              <span
                className={cn(
                  reason.trim().length > MAX_REASON_LENGTH ? 'text-red-600' : 'text-gray-500'
                )}
              >
                {reason.trim().length} / {MAX_REASON_LENGTH} caractères
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
            data-testid="reopen-demand-modal-cancel"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            data-testid="reopen-demand-modal-confirm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Réouverture en cours...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                Réouvrir
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
