'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCaisseSpecialeDemandMutations } from '@/hooks/caisse-speciale/useCaisseSpecialeDemands'
import { approveDemandSchema } from '@/schemas/caisse-speciale.schema'
import { CaisseSpecialeDemand } from '@/types/types'
import {
    AlertTriangle,
    CheckCircle,
    Loader2,
} from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

interface AcceptDemandModalProps {
  isOpen: boolean
  onClose: () => void
  demand: CaisseSpecialeDemand | null
  onSuccess?: () => void
}

export default function AcceptDemandModal({
  isOpen,
  onClose,
  demand,
  onSuccess,
}: AcceptDemandModalProps) {
  const [reason, setReason] = useState('')
  const { approve } = useCaisseSpecialeDemandMutations()

  React.useEffect(() => {
    if (isOpen) {
      setReason('')
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!demand) return

    // Validation avec Zod
    try {
      approveDemandSchema.parse({ reason })
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0]?.message || 'Erreur de validation')
        return
      }
    }

    try {
      await approve.mutateAsync({
        demandId: demand.id,
        reason: reason.trim(),
      })
      
      toast.success('Demande acceptée avec succès')
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Erreur lors de l\'acceptation:', error)
      toast.error(error?.message || 'Erreur lors de l\'acceptation de la demande')
    }
  }

  if (!demand) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <ModalContent size="lg">
        <ModalHeader
          icon={CheckCircle}
          tone="success"
          title="Accepter la demande"
          description="Vous êtes sur le point d'accepter cette demande de contrat Caisse Spéciale. Veuillez indiquer le motif d'acceptation."
        />

        <ModalBody className="space-y-6">
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

          {/* Motif d'acceptation */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-semibold text-gray-900">
              Raison d'acceptation *
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indiquez le motif d'acceptation de cette demande..."
              rows={4}
              required
              className="resize-none border-gray-300 focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65]"
            />
            {!reason.trim() && (
              <p className="text-sm text-red-600 mt-1">
                La raison d'acceptation est obligatoire (minimum 10 caractères)
              </p>
            )}
            <p className="text-xs text-gray-500">
              Expliquez pourquoi cette demande est acceptée (ex: membre à jour, demande justifiée...)
            </p>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={approve.isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={approve.isPending || !reason.trim() || reason.trim().length < 10}
            className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
          >
            {approve.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Acceptation...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Accepter
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}

