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
  RotateCcw,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { PlacementDemand } from '@/types/types'
import { usePlacementDemandMutations } from '@/hooks/placement/usePlacementDemands'
import { toast } from 'sonner'
import { reopenDemandSchema } from '@/schemas/placement.schema'
import { z } from 'zod'

interface ReopenDemandModalProps {
  isOpen: boolean
  onClose: () => void
  demand: PlacementDemand | null
  onSuccess?: () => void
}

export default function ReopenDemandModal({
  isOpen,
  onClose,
  demand,
  onSuccess,
}: ReopenDemandModalProps) {
  const [reason, setReason] = useState('')
  const { reopen } = usePlacementDemandMutations()

  React.useEffect(() => {
    if (isOpen) {
      setReason('')
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!demand) return

    // Validation avec Zod
    try {
      reopenDemandSchema.parse({ reason })
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0]?.message || 'Erreur de validation')
        return
      }
    }

    try {
      await reopen.mutateAsync({
        demandId: demand.id,
        reason: reason.trim(),
      })
      
      toast.success('Demande réouverte avec succès')
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Erreur lors de la réouverture:', error)
      toast.error(error?.message || 'Erreur lors de la réouverture de la demande')
    }
  }

  if (!demand) return null

  const getPayoutModeLabel = (mode: string) => {
    return mode === 'MonthlyCommission_CapitalEnd' 
      ? 'Commission mensuelle + Capital en fin'
      : 'Capital + Commission en fin'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-blue-600" />
            Réouvrir la demande
          </DialogTitle>
          <DialogDescription>
            Vous êtes sur le point de réouvrir cette demande de placement qui a été refusée. Veuillez indiquer le motif de réouverture.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations de la demande */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Bienfaiteur:</strong> {demand.benefactorName || 'Non renseigné'}</p>
                <p><strong>Montant:</strong> {demand.amount.toLocaleString('fr-FR')} FCFA</p>
                <p><strong>Taux de commission:</strong> {demand.rate}%</p>
                <p><strong>Durée prévue:</strong> {demand.periodMonths} mois</p>
                <p><strong>Mode de paiement:</strong> {getPayoutModeLabel(demand.payoutMode)}</p>
                {demand.desiredDate && (
                  <p><strong>Date souhaitée:</strong> {new Date(demand.desiredDate).toLocaleDateString('fr-FR')}</p>
                )}
                {demand.decisionReason && (
                  <p><strong>Raison du refus initial:</strong> {demand.decisionReason}</p>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* Motif de réouverture */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-semibold text-gray-900">
              Motif de réouverture *
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indiquez le motif de réouverture de cette demande..."
              rows={4}
              required
              className="resize-none border-gray-300 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65]"
            />
            {!reason.trim() && (
              <p className="text-sm text-red-600 mt-1">
                Le motif de réouverture est obligatoire (minimum 10 caractères)
              </p>
            )}
            <p className="text-xs text-gray-500">
              Expliquez pourquoi cette demande doit être réouverte (ex: nouvelle information, erreur dans le refus initial...)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={reopen.isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={reopen.isPending || !reason.trim() || reason.trim().length < 10}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            {reopen.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Réouverture...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Réouvrir
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

