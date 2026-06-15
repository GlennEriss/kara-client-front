'use client'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { fixedTransitionSchema } from '@/schemas/credit-speciale.schema'
import { CreditContract } from '@/types/types'
import { AlertTriangle, Loader2 } from 'lucide-react'
import React, { useState } from 'react'

interface SwitchToFixedPhaseModalProps {
  isOpen: boolean
  onClose: () => void
  contract: CreditContract
  onConfirm: (reason: string) => Promise<void>
  isPending?: boolean
}

export default function SwitchToFixedPhaseModal({
  isOpen,
  onClose,
  contract,
  onConfirm,
  isPending = false,
}: SwitchToFixedPhaseModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleClose = () => {
    setReason('')
    setError(null)
    onClose()
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const result = fixedTransitionSchema.safeParse({ reason: reason.trim() })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Validation échouée')
      return
    }

    try {
      await onConfirm(result.data.reason)
      handleClose()
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du basculement en partie fixe')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <ModalContent size="md">
        <ModalHeader
          icon={AlertTriangle}
          tone="warning"
          title="Basculer en partie fixe"
          description="Ce basculement est irréversible. À partir de cette action, le contrat ne générera plus d’intérêts sur la partie spéciale et le garant ne percevra plus de commissions."
        />

        <ModalBody>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Vous êtes sur le point de basculer le contrat de
          {' '}
          <span className="font-semibold">
            {contract.clientFirstName} {contract.clientLastName}
          </span>
          {' '}
          en partie fixe. Cette action sera enregistrée avec votre identifiant administrateur,
          la date du basculement et le motif saisi.
        </div>

        <form id="switch-fixed-form" onSubmit={handleConfirm} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fixed-transition-reason">
              Raison du basculement (obligatoire, 10 à 500 caractères)
            </Label>
            <Textarea
              id="fixed-transition-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: basculement anticipé décidé par l'administration suite à rééchelonnement du solde restant"
              rows={5}
              disabled={isPending}
              className="resize-y"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <p className="text-xs text-gray-500">{reason.trim().length}/500 caractères</p>
          </div>

        </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Annuler
          </Button>
          <Button
            type="submit"
            form="switch-fixed-form"
            disabled={isPending || reason.trim().length < 10}
            className="bg-[#234D65] hover:bg-[#1b3b4d] text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Basculement...
              </>
            ) : (
              'Confirmer le basculement'
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
