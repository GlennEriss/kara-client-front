'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { CaisseSpecialeDemand } from '@/types/types'
import { useCaisseSpecialeDemandMutations } from '@/hooks/caisse-speciale/useCaisseSpecialeDemands'
import { toast } from 'sonner'
import { rejectDemandSchema } from '@/schemas/caisse-speciale.schema'
import { z } from 'zod'

interface RejectDemandModalProps {
  isOpen: boolean
  onClose: () => void
  demand: CaisseSpecialeDemand | null
  onSuccess?: () => void
}

export default function RejectDemandModal({
  isOpen,
  onClose,
  demand,
  onSuccess,
}: RejectDemandModalProps) {
  const [reason, setReason] = useState('')
  const { reject } = useCaisseSpecialeDemandMutations()

  React.useEffect(() => {
    if (isOpen) {
      setReason('')
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!demand) return

    // Validation avec Zod
    try {
      rejectDemandSchema.parse({ reason })
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0]?.message || 'Erreur de validation')
        return
      }
    }

    try {
      await reject.mutateAsync({
        demandId: demand.id,
        reason: reason.trim(),
      })
      
      toast.success('Demande refusée')
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Erreur lors du refus:', error)
      toast.error(error?.message || 'Erreur lors du refus de la demande')
    }
  }

  if (!demand) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            <XCircle className="h-6 w-6 text-red-600" />
            Refuser la demande
          </DialogTitle>
          <DialogDescription>
            Vous êtes sur le point de refuser cette demande de contrat Caisse Spéciale. Veuillez indiquer le motif du refus.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations de la demande */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Type:</strong> Individuel</p>
                <p><strong>Type de caisse:</strong> {demand.caisseType}</p>
                <p><strong>Montant mensuel:</strong> {demand.monthlyAmount.toLocaleString('fr-FR')} FCFA</p>
                <p><strong>Durée prévue:</strong> {demand.monthsPlanned} mois</p>
                {demand.desiredDate && (
                  <p><strong>Date souhaitée:</strong> {new Date(demand.desiredDate).toLocaleDateString('fr-FR')}</p>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* Motif du refus */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-semibold text-gray-900">
              Raison du refus *
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indiquez le motif du refus de cette demande..."
              rows={4}
              required
              className="resize-none border-gray-300 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65]"
            />
            {!reason.trim() && (
              <p className="text-sm text-red-600 mt-1">
                La raison du refus est obligatoire (minimum 10 caractères)
              </p>
            )}
            <p className="text-xs text-gray-500">
              Expliquez clairement pourquoi cette demande est refusée (ex: membre en retard sur ses paiements...)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={reject.isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={reject.isPending || !reason.trim() || reason.trim().length < 10}
            className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
          >
            {reject.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Rejet...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Refuser
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

