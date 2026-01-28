/**
 * Modal de confirmation de création de contrat depuis une demande acceptée
 * 
 * Responsive : Mobile, Tablette, Desktop
 * Affiche les détails de la demande et confirme la création du contrat
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
import { FileCheck, Loader2, User, DollarSign, Calendar } from 'lucide-react'
import type { CaisseImprevueDemand } from '../../entities/demand.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ConfirmContractModalV2Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  demand: CaisseImprevueDemand
  isLoading?: boolean
}

export function ConfirmContractModalV2({
  isOpen,
  onClose,
  onConfirm,
  demand,
  isLoading = false,
}: ConfirmContractModalV2Props) {
  const handleConfirm = async () => {
    await onConfirm()
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  const createdAt = demand.createdAt instanceof Date ? demand.createdAt : new Date(demand.createdAt)
  const desiredDate = new Date(demand.desiredStartDate)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="w-[95vw] max-w-[95vw] sm:max-w-[600px] sm:w-full"
        data-testid="confirm-contract-modal"
      >
        <DialogHeader>
          <DialogTitle
            className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-lg sm:text-xl font-bold text-kara-primary-dark"
            data-testid="confirm-contract-modal-title"
          >
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
              <span className="break-words">Créer un contrat</span>
            </div>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-gray-600 mt-2">
            Confirmez la création d'un contrat depuis la demande #{demand.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informations demande */}
          <div className="rounded-lg bg-gray-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Demandeur :</span>
              <span>
                {demand.memberFirstName} {demand.memberLastName}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Forfait :</span>
              <span>
                {demand.subscriptionCICode} -{' '}
                {demand.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA/
                {demand.paymentFrequency === 'DAILY' ? 'jour' : 'mois'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Date souhaitée :</span>
              <span>{format(desiredDate, 'dd MMMM yyyy', { locale: fr })}</span>
            </div>
            <div className="text-xs text-gray-500">
              Demande créée le {format(createdAt, 'dd MMMM yyyy à HH:mm', { locale: fr })}
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
            <p className="text-xs sm:text-sm text-blue-800">
              <strong>Note :</strong> La demande sera automatiquement marquée comme "Convertie" après la création
              du contrat.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
            data-testid="confirm-contract-modal-cancel"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            data-testid="confirm-contract-modal-confirm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4 mr-2" />
                Créer le contrat
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
