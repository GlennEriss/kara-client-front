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
import { CreditDemand } from '@/types/types'
import { useCreditDemandMutations } from '@/hooks/useCreditSpeciale'
import { toast } from 'sonner'

interface ReopenDemandModalProps {
  isOpen: boolean
  onClose: () => void
  demand: CreditDemand | null
  onSuccess?: () => void
}

export default function ReopenDemandModal({
  isOpen,
  onClose,
  demand,
  onSuccess,
}: ReopenDemandModalProps) {
  const [reopenReason, setReopenReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { updateStatus } = useCreditDemandMutations()

  React.useEffect(() => {
    if (isOpen) {
      setReopenReason('')
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!demand) return

    // Validation : motif requis
    if (!reopenReason.trim()) {
      toast.error('Veuillez indiquer le motif de réouverture')
      return
    }

    try {
      setIsSubmitting(true)
      await updateStatus.mutateAsync({
        id: demand.id,
        status: 'PENDING',
        comments: `Réouverture: ${reopenReason.trim()}`,
      })
      
      toast.success('Demande réouverte avec succès')
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Erreur lors de la réouverture de la demande:', error)
      toast.error(error?.message || 'Erreur lors de la réouverture de la demande')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!demand) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-blue-600" />
            Réouvrir la demande
          </DialogTitle>
          <DialogDescription>
            Vous êtes sur le point de réouvrir cette demande rejetée. Veuillez indiquer le motif de réouverture.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations de la demande */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Client:</strong> {demand.clientFirstName} {demand.clientLastName}</p>
                <p><strong>Type:</strong> {demand.creditType}</p>
                <p><strong>Montant:</strong> {demand.amount.toLocaleString('fr-FR')} FCFA</p>
                {demand.guarantorId && (
                  <p><strong>Garant:</strong> {demand.guarantorFirstName} {demand.guarantorLastName}</p>
                )}
                {demand.adminComments && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-sm text-gray-600"><strong>Motif du rejet précédent:</strong></p>
                    <p className="text-sm text-gray-700">{demand.adminComments}</p>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* Motif de réouverture */}
          <div className="space-y-2">
            <Label htmlFor="reopenReason" className="text-sm font-semibold text-gray-900">
              Motif de réouverture *
            </Label>
            <Textarea
              id="reopenReason"
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Indiquez le motif de réouverture de cette demande (ex: nouvelles informations fournies, garant supplémentaire, correction d'erreur...)"
              rows={5}
              required
              className="resize-none border-gray-300 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65]"
            />
            {!reopenReason.trim() && (
              <p className="text-sm text-red-600 mt-1">
                Le motif de réouverture est obligatoire
              </p>
            )}
            <p className="text-xs text-gray-500">
              Expliquez clairement pourquoi cette demande doit être réouverte et réexaminée (ex: nouvelles informations fournies, garant supplémentaire ajouté, correction d'erreur dans les documents...)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !reopenReason.trim()}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Réouverture...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Réouvrir la demande
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

