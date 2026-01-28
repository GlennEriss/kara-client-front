/**
 * Modal de suppression d'une demande Caisse Imprévue V2
 * 
 * Responsive : Mobile, Tablette, Desktop
 * Confirmation obligatoire
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
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'

interface DeleteDemandModalV2Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  demandId: string
  memberName: string
  isLoading?: boolean
}

export function DeleteDemandModalV2({
  isOpen,
  onClose,
  onConfirm,
  demandId,
  memberName,
  isLoading = false,
}: DeleteDemandModalV2Props) {
  const handleConfirm = async () => {
    await onConfirm()
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="w-[95vw] max-w-[95vw] sm:max-w-[500px] sm:w-full"
        data-testid="delete-demand-modal"
      >
        <DialogHeader>
          <DialogTitle
            className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-lg sm:text-xl font-bold text-kara-primary-dark"
            data-testid="delete-demand-modal-title"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
              <span className="break-words">Supprimer la demande</span>
            </div>
          </DialogTitle>
          <DialogDescription
            className="text-xs sm:text-sm text-gray-600 mt-2"
            data-testid="delete-demand-modal-description"
          >
            Êtes-vous sûr de vouloir supprimer la demande de{' '}
            <strong data-testid="delete-demand-modal-member-name" className="break-words">
              {memberName}
            </strong>
            ? Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 sm:py-4">
          <div className="rounded-lg bg-red-50 p-3 sm:p-4 border border-red-200">
            <p className="text-xs sm:text-sm text-red-800">
              <strong>Attention :</strong> La suppression enregistrera la traçabilité (deletedBy, deletedAt) avant
              de supprimer définitivement la demande de la base de données.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
            data-testid="delete-demand-modal-cancel"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            variant="destructive"
            className="w-full sm:w-auto"
            data-testid="delete-demand-modal-confirm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Suppression en cours...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
