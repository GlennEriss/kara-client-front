/**
 * Modal de réouverture V2 pour une demande d'adhésion rejetée
 * 
 * Permet de réouvrir un dossier rejeté en fournissant un motif de réouverture
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
import { RotateCcw, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { MEMBERSHIP_REQUEST_VALIDATION } from '@/constantes/membership-requests'

interface ReopenModalV2Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
  requestId: string
  memberName: string
  matricule: string
  previousRejectReason: string
  isLoading?: boolean
}

export function ReopenModalV2({
  isOpen,
  onClose,
  onConfirm,
  requestId,
  memberName,
  matricule,
  previousRejectReason,
  isLoading = false,
}: ReopenModalV2Props) {
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
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[500px] sm:w-full" data-testid="reopen-modal">
        <DialogHeader>
          <DialogTitle
            className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-lg sm:text-xl font-bold text-kara-primary-dark"
            data-testid="reopen-modal-title"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
              <span className="break-words">Réouvrir la demande d'adhésion</span>
            </div>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-gray-600 mt-2" data-testid="reopen-modal-description">
            Vous êtes sur le point de réouvrir cette demande qui a été rejetée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-2 sm:py-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {/* Informations du dossier */}
          <div className="space-y-2 sm:space-y-2 rounded-lg bg-gray-50 p-3 sm:p-4">
            <div className="text-xs sm:text-sm break-words">
              <span className="font-semibold text-gray-700">Demandeur :</span>{' '}
              <span className="text-gray-900" data-testid="reopen-modal-member-name">
                {memberName}
              </span>
            </div>
            <div className="text-xs sm:text-sm break-all">
              <span className="font-semibold text-gray-700">Matricule :</span>{' '}
              <span className="text-gray-900 font-mono text-xs" data-testid="reopen-modal-matricule">
                {matricule}
              </span>
            </div>
            <div className="text-xs sm:text-sm">
              <span className="font-semibold text-gray-700">Motif de rejet initial :</span>
              <div className="mt-1 rounded bg-red-50 p-2 text-gray-800 text-xs sm:text-sm break-words" data-testid="reopen-modal-previous-reject-reason">
                {previousRejectReason}
              </div>
            </div>
          </div>

          {/* Motif de réouverture */}
          <div className="space-y-2">
            <Label htmlFor="reopen-reason" className="text-xs sm:text-sm font-semibold text-kara-primary-dark" data-testid="reopen-modal-reason-label">
              Motif de réouverture <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reopen-reason"
              data-testid="reopen-modal-reason-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indiquez le motif de réouverture de ce dossier..."
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
                data-testid="reopen-modal-reason-counter"
              >
                {reason.trim().length > 0 && reason.trim().length < minLength
                  ? `Minimum ${minLength} caractères requis`
                  : `${reason.trim().length} / ${maxLength} caractères`}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2 pt-2 sm:pt-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full sm:w-auto border-gray-300 text-sm"
            data-testid="reopen-modal-cancel-button"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !isValid}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-sm"
            data-testid="reopen-modal-submit-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" data-testid="reopen-modal-loading" />
                <span className="hidden sm:inline">Réouverture en cours...</span>
                <span className="sm:hidden">En cours...</span>
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
