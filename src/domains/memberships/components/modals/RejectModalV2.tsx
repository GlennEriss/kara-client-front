/**
 * Modal de rejet V2 pour une demande d'adhésion
 * 
 * Suit les diagrammes de séquence et la logique métier
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-kara-primary-dark">
            <XCircle className="w-5 h-5 text-red-600" />
            Rejeter la demande d'adhésion
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Vous êtes sur le point de rejeter la demande de <strong>{memberName}</strong>.
            Veuillez fournir un motif de rejet (minimum {minLength} caractères).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Motif de rejet */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-semibold text-kara-primary-dark">
              Motif de rejet <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indiquez le motif de rejet de cette demande..."
              disabled={isLoading}
              rows={5}
              className="resize-none"
              maxLength={maxLength}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span className={cn(
                reason.trim().length > 0 && reason.trim().length < minLength && 'text-amber-600'
              )}>
                {reason.trim().length > 0 && reason.trim().length < minLength
                  ? `Minimum ${minLength} caractères requis`
                  : `${reason.trim().length} / ${maxLength} caractères`}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="border-gray-300"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !isValid}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Rejet en cours...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Rejeter
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
