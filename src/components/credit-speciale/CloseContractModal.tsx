'use client'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { closeContractSchema } from '@/schemas/credit-speciale.schema'
import { CreditContract } from '@/types/types'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import React, { useState } from 'react'

interface CloseContractModalProps {
  isOpen: boolean
  onClose: () => void
  contract: CreditContract
  onCloseContract: (data: { closedAt: Date; motifCloture: string }) => Promise<void>
  isPending?: boolean
}

export default function CloseContractModal({
  isOpen,
  onClose,
  contract,
  onCloseContract,
  isPending = false,
}: CloseContractModalProps) {
  const now = new Date()
  const [closedAtDate, setClosedAtDate] = useState(format(now, 'yyyy-MM-dd'))
  const [closedAtTime, setClosedAtTime] = useState(
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  )
  const [motifCloture, setMotifCloture] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const result = closeContractSchema.safeParse({
      closedAtDate,
      closedAtTime,
      motifCloture: motifCloture.trim(),
    })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Validation échouée')
      return
    }

    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    setError(null)
    const closedAt = new Date(`${closedAtDate}T${closedAtTime}`)
    if (isNaN(closedAt.getTime())) {
      setError('Date ou heure invalide')
      return
    }

    const result = closeContractSchema.safeParse({
      closedAtDate,
      closedAtTime,
      motifCloture: motifCloture.trim(),
    })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Validation échouée')
      return
    }

    try {
      await onCloseContract({ closedAt, motifCloture: result.data.motifCloture })
      setMotifCloture('')
      setShowConfirm(false)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la clôture')
    }
  }

  const handleClose = () => {
    setMotifCloture('')
    setClosedAtDate(format(new Date(), 'yyyy-MM-dd'))
    setClosedAtTime(
      `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`
    )
    setError(null)
    setShowConfirm(false)
    onClose()
  }

  if (showConfirm) {
    return (
      <Modal
        open={isOpen}
        onOpenChange={(open) => !open && handleClose()}
        size="sm"
        title="Confirmer la clôture"
        description="Êtes-vous d'accord pour clôturer ce contrat ?"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowConfirm(false)} disabled={isPending}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clôture...
                </>
              ) : (
                'Confirmer la clôture'
              )}
            </Button>
          </>
        }
      >
        {error && <p className="text-sm text-red-500">{error}</p>}
      </Modal>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <ModalContent size="sm">
        <ModalHeader
          title="Clôturer le contrat"
          description={`Remplissez les informations pour clôturer le contrat de ${contract.clientFirstName} ${contract.clientLastName}.`}
        />
        <ModalBody>
        <form id="close-contract-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="closedAtDate">Date de clôture</Label>
              <Input
                id="closedAtDate"
                type="date"
                value={closedAtDate}
                onChange={(e) => setClosedAtDate(e.target.value)}
                disabled={isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closedAtTime">Heure</Label>
              <Input
                id="closedAtTime"
                type="time"
                value={closedAtTime}
                onChange={(e) => setClosedAtTime(e.target.value)}
                disabled={isPending}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="motifCloture">Motif de clôture (obligatoire, 10-500 caractères)</Label>
            <Textarea
              id="motifCloture"
              value={motifCloture}
              onChange={(e) => setMotifCloture(e.target.value)}
              placeholder="Ex: Quittance signée reçue et archivée"
              minLength={10}
              maxLength={500}
              required
              disabled={isPending}
              rows={4}
              className={error ? 'border-red-500 resize-y' : 'resize-y'}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <p className="text-xs text-gray-500">{motifCloture.length}/500 caractères</p>
          </div>
        </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Annuler
          </Button>
          <Button
            type="submit"
            form="close-contract-form"
            disabled={isPending || motifCloture.trim().length < 10}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Clôturer le contrat
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
