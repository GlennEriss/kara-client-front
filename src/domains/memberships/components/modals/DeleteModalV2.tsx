/**
 * Modal de suppression V2 pour une demande d'adhésion rejetée
 * 
 * Permet de supprimer définitivement un dossier rejeté avec confirmation de matricule
 */

'use client'

import { Dialog } from '@/components/ui/responsive-dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { useState } from 'react'

interface DeleteModalV2Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (confirmedMatricule: string) => Promise<void>
  requestId: string
  memberName: string
  matricule: string
  isLoading?: boolean
}

export function DeleteModalV2({
  isOpen,
  onClose,
  onConfirm,
  requestId,
  memberName,
  matricule,
  isLoading = false,
}: DeleteModalV2Props) {
  const [confirmedMatricule, setConfirmedMatricule] = useState('')
  const isValid = confirmedMatricule.trim() === matricule

  const handleConfirm = async () => {
    if (!isValid) {
      return
    }

    await onConfirm(confirmedMatricule.trim())
  }

  const handleClose = () => {
    if (!isLoading) {
      setConfirmedMatricule('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <ModalContent className="w-[95vw] max-w-[95vw] sm:max-w-[500px] sm:w-full" data-testid="delete-modal">
        <ModalHeader
          icon={Trash2}
          tone="destructive"
          title={<span data-testid="delete-modal-title">Supprimer définitivement le dossier</span>}
          description={
            <span data-testid="delete-modal-description">
              Cette action est irréversible. Toutes les données seront définitivement supprimées.
            </span>
          }
        />

        <ModalBody className="space-y-3 sm:space-y-4">
          {/* Avertissement */}
          <Alert variant="destructive" data-testid="delete-modal-warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-semibold">
              La suppression sera définitive et non réversible.
            </AlertDescription>
          </Alert>

          {/* Informations du dossier */}
          <div className="space-y-2 sm:space-y-2 rounded-lg bg-gray-50 p-3 sm:p-4">
            <div className="text-xs sm:text-sm break-words">
              <span className="font-semibold text-gray-700">Nom :</span>{' '}
              <span className="text-gray-900" data-testid="delete-modal-member-name">
                {memberName}
              </span>
            </div>
            <div className="text-xs sm:text-sm break-all">
              <span className="font-semibold text-gray-700">Matricule :</span>{' '}
              <span className="text-gray-900 font-mono text-xs" data-testid="delete-modal-matricule-display">
                {matricule}
              </span>
            </div>
          </div>

          {/* Confirmation matricule */}
          <div className="space-y-2">
            <Label
              htmlFor="confirmed-matricule"
              className="text-xs sm:text-sm font-semibold text-kara-primary-dark"
              data-testid="delete-modal-matricule-label"
            >
              Confirmer le matricule <span className="text-red-500">*</span>
            </Label>
            <Input
              id="confirmed-matricule"
              data-testid="delete-modal-matricule-input"
              type="text"
              value={confirmedMatricule}
              onChange={(e) => setConfirmedMatricule(e.target.value)}
              placeholder="Saisir le matricule pour confirmer"
              disabled={isLoading}
              className={cn(
                'font-mono text-sm',
                confirmedMatricule.trim().length > 0 && !isValid && 'border-red-500 focus:ring-red-500'
              )}
            />
            {confirmedMatricule.trim().length > 0 && !isValid && (
              <p className="text-xs text-red-500 break-words" data-testid="delete-modal-matricule-error">
                Le matricule saisi ne correspond pas au matricule du dossier.
              </p>
            )}
          </div>
        </ModalBody>

        <ModalFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full sm:w-auto border-gray-300 text-sm"
            data-testid="delete-modal-cancel-button"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !isValid}
            variant="destructive"
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white text-sm"
            data-testid="delete-modal-submit-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" data-testid="delete-modal-loading" />
                <span className="hidden sm:inline">Suppression en cours...</span>
                <span className="sm:hidden">En cours...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
