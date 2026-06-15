'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCaisseImprevueDemandMutations } from '@/hooks/caisse-imprevue/useCaisseImprevueDemands'
import { reopenCaisseImprevueDemandSchema } from '@/schemas/caisse-imprevue.schema'
import { CaisseImprevueDemand } from '@/types/types'
import {
    AlertTriangle,
    Loader2,
    RotateCcw,
} from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

interface ReopenDemandModalProps {
  isOpen: boolean
  onClose: () => void
  demand: CaisseImprevueDemand | null
  onSuccess?: () => void
}

export default function ReopenDemandModal({
  isOpen,
  onClose,
  demand,
  onSuccess,
}: ReopenDemandModalProps) {
  const [reason, setReason] = useState('')
  const { reopen } = useCaisseImprevueDemandMutations()

  React.useEffect(() => {
    if (isOpen) {
      setReason('')
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!demand) return

    try {
      reopenCaisseImprevueDemandSchema.parse({ reason })
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

  return (
    <Modal
      open={isOpen}
      onOpenChange={onClose}
      size="lg"
      icon={RotateCcw}
      title="Réouvrir la demande"
      description="Vous êtes sur le point de réouvrir cette demande de contrat Caisse Imprévue qui a été refusée. Veuillez indiquer le motif de réouverture."
      footer={
        <>
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
        </>
      }
    >
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p><strong>Forfait:</strong> {demand.subscriptionCICode} {demand.subscriptionCILabel && `- ${demand.subscriptionCILabel}`}</p>
            <p><strong>Fréquence:</strong> {demand.paymentFrequency === 'DAILY' ? 'Journalière' : 'Mensuelle'}</p>
            <p><strong>Montant mensuel:</strong> {demand.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA</p>
            <p><strong>Durée:</strong> {demand.subscriptionCIDuration} mois</p>
            {demand.desiredDate && (
              <p><strong>Date souhaitée:</strong> {new Date(demand.desiredDate).toLocaleDateString('fr-FR')}</p>
            )}
            {demand.decisionReason && (
              <p><strong>Raison du refus initial:</strong> {demand.decisionReason}</p>
            )}
          </div>
        </AlertDescription>
      </Alert>

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
          Expliquez pourquoi cette demande doit être réouverte
        </p>
      </div>
    </Modal>
  )
}
