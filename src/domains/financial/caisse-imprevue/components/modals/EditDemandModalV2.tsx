/**
 * Modal d'édition d'une demande Caisse Imprévue V2
 * 
 * Responsive : Mobile, Tablette, Desktop
 * Permet d'éditer : motif, forfait, fréquence, date, contact d'urgence
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Edit, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSubscriptionsCICache } from '@/domains/financial/caisse-imprevue/hooks'
import { Skeleton } from '@/components/ui/skeleton'
import type { CaisseImprevueDemand } from '../../entities/demand.types'
import type { UpdateCaisseImprevueDemandInput } from '../../entities/demand.types'

interface EditDemandModalV2Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: UpdateCaisseImprevueDemandInput) => Promise<void>
  demand: CaisseImprevueDemand
  isLoading?: boolean
}

export function EditDemandModalV2({
  isOpen,
  onClose,
  onConfirm,
  demand,
  isLoading = false,
}: EditDemandModalV2Props) {
  const [cause, setCause] = useState(demand.cause || '')
  const [paymentFrequency, setPaymentFrequency] = useState<'DAILY' | 'MONTHLY'>(demand.paymentFrequency)
  const [desiredStartDate, setDesiredStartDate] = useState(
    demand.desiredStartDate ? new Date(demand.desiredStartDate).toISOString().split('T')[0] : ''
  )

  const { data: subscriptions, isLoading: isLoadingSubs } = useSubscriptionsCICache()

  useEffect(() => {
    if (isOpen) {
      setCause(demand.cause || '')
      setPaymentFrequency(demand.paymentFrequency)
      setDesiredStartDate(
        demand.desiredStartDate ? new Date(demand.desiredStartDate).toISOString().split('T')[0] : ''
      )
    }
  }, [isOpen, demand])

  const isValid = cause.trim().length >= 10 && cause.trim().length <= 500 && desiredStartDate

  const handleConfirm = async () => {
    if (!isValid) {
      return
    }

    const updateData: UpdateCaisseImprevueDemandInput = {
      cause: cause.trim(),
      paymentFrequency,
      desiredStartDate,
    }

    await onConfirm(updateData)
  }

  const handleClose = () => {
    if (!isLoading) {
      setCause(demand.cause || '')
      setPaymentFrequency(demand.paymentFrequency)
      setDesiredStartDate(
        demand.desiredStartDate ? new Date(demand.desiredStartDate).toISOString().split('T')[0] : ''
      )
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="w-[95vw] max-w-[95vw] sm:max-w-[600px] sm:w-full max-h-[90vh] overflow-y-auto"
        data-testid="edit-demand-modal"
      >
        <DialogHeader>
          <DialogTitle
            className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-lg sm:text-xl font-bold text-kara-primary-dark"
            data-testid="edit-demand-modal-title"
          >
            <div className="flex items-center gap-2">
              <Edit className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
              <span className="break-words">Modifier la demande</span>
            </div>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-gray-600 mt-2">
            Modifiez les informations de la demande #{demand.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Motif */}
          <div className="space-y-2">
            <Label htmlFor="edit-cause" className="text-sm font-medium">
              Motif de la demande <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="edit-cause"
              value={cause}
              onChange={(e) => setCause(e.target.value)}
              placeholder="Décrivez la raison de la demande..."
              className="min-h-[100px] resize-none"
              disabled={isLoading}
              data-testid="edit-demand-cause-textarea"
            />
            <p className="text-xs text-gray-500">
              {cause.trim().length} / 500 caractères
              {cause.trim().length > 0 && cause.trim().length < 10 && (
                <span className="text-amber-600 ml-1">(minimum 10 requis)</span>
              )}
            </p>
          </div>

          {/* Fréquence */}
          <div className="space-y-2">
            <Label htmlFor="edit-frequency" className="text-sm font-medium">
              Fréquence de paiement
            </Label>
            <Select value={paymentFrequency} onValueChange={(v) => setPaymentFrequency(v as any)}>
              <SelectTrigger id="edit-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY">Mensuel</SelectItem>
                <SelectItem value="DAILY">Quotidien</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date souhaitée */}
          <div className="space-y-2">
            <Label htmlFor="edit-date" className="text-sm font-medium">
              Date souhaitée de début
            </Label>
            <Input
              id="edit-date"
              type="date"
              value={desiredStartDate}
              onChange={(e) => setDesiredStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              disabled={isLoading}
              data-testid="edit-demand-date-input"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
            data-testid="edit-demand-modal-cancel"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            className="w-full sm:w-auto"
            data-testid="edit-demand-modal-confirm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Modification en cours...
              </>
            ) : (
              <>
                <Edit className="w-4 h-4 mr-2" />
                Enregistrer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
