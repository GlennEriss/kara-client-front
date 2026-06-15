'use client'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { finalRepaymentSchema } from '@/schemas/credit-speciale.schema'
import { CreditContract } from '@/types/types'
import { Loader2 } from 'lucide-react'
import React, { useState } from 'react'

interface FinalRepaymentModalProps {
  isOpen: boolean
  onClose: () => void
  contract: CreditContract
  onValidate: (motif: string) => Promise<void>
  isPending?: boolean
}

export default function FinalRepaymentModal({
  isOpen,
  onClose,
  contract,
  onValidate,
  isPending = false,
}: FinalRepaymentModalProps) {
  const [motif, setMotif] = useState('')
  const [error, setError] = useState<string | null>(null)

  const clientName = `${contract.clientFirstName || ''} ${contract.clientLastName || ''}`.trim() || 'le membre'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const result = finalRepaymentSchema.safeParse({ motif: motif.trim() })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Validation échouée')
      return
    }

    try {
      await onValidate(result.data.motif)
      setMotif('')
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la validation')
    }
  }

  const handleClose = () => {
    setMotif('')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <ModalContent size="sm">
        <ModalHeader
          title="Remboursement final"
          description={`Acceptez-vous de valider le remboursement final de l'emprunt du membre ${clientName} ?`}
        />
        <ModalBody>
        <form id="final-repayment-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="motif">Motif (obligatoire, 10-500 caractères)</Label>
            <Textarea
              id="motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex: Remboursement intégral validé après vérification des derniers versements"
              minLength={10}
              maxLength={500}
              required
              disabled={isPending}
              rows={4}
              className={error ? 'border-red-500 resize-y' : 'resize-y'}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <p className="text-xs text-gray-500">{motif.length}/500 caractères</p>
          </div>
        </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Annuler
          </Button>
          <Button
            type="submit"
            form="final-repayment-form"
            disabled={isPending || motif.trim().length < 10}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validation...
              </>
            ) : (
              'Valider le remboursement final'
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
