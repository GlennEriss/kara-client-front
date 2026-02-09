'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { useCreditContractMutations } from '@/hooks/useCreditSpeciale'
import { toast } from 'sonner'
import type { CreditContract } from '@/types/types'

interface DeleteCreditContractModalProps {
  isOpen: boolean
  onClose: () => void
  contract: CreditContract | null
  onSuccess?: () => void
}

export default function DeleteCreditContractModal({
  isOpen,
  onClose,
  contract,
  onSuccess,
}: DeleteCreditContractModalProps) {
  const [confirmContractId, setConfirmContractId] = useState('')
  const [confirmClientName, setConfirmClientName] = useState('')
  const { deleteContract } = useCreditContractMutations()

  useEffect(() => {
    if (isOpen) {
      setConfirmContractId('')
      setConfirmClientName('')
    }
  }, [isOpen, contract])

  const handleSubmit = async () => {
    if (!contract) return

    const expectedContractId = contract.id
    const expectedClientName = (contract.clientLastName || '').trim()

    if (confirmContractId.trim() !== expectedContractId) {
      toast.error("L'ID du contrat ne correspond pas")
      return
    }
    if (confirmClientName.trim() !== expectedClientName) {
      toast.error('Le nom du client ne correspond pas')
      return
    }

    try {
      await deleteContract.mutateAsync(contract.id)
      onSuccess?.()
      onClose()
    } catch {
      // Erreur gérée par le hook
    }
  }

  if (!contract) return null

  const expectedContractId = contract.id
  const expectedClientName = (contract.clientLastName || '').trim()
  const isContractIdMatch = confirmContractId.trim() === expectedContractId
  const isClientNameMatch = confirmClientName.trim() === expectedClientName
  const canConfirm = isContractIdMatch && isClientNameMatch

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-red-600 flex items-center gap-2">
            <Trash2 className="h-6 w-6" />
            Supprimer définitivement le contrat
          </DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Le contrat ne pourra pas être récupéré.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold">Attention : suppression définitive</p>
              <p className="mt-2">
                En confirmant, vous supprimez définitivement ce contrat de crédit. Cette action ne peut pas être
                annulée et les données ne pourront pas être récupérées.
              </p>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Pour confirmer la suppression, recopiez exactement les informations suivantes :
            </p>

            <div className="space-y-2">
              <Label htmlFor="confirm-contract-id" className="text-sm font-semibold text-gray-900">
                ID du contrat à supprimer
              </Label>
              <p className="text-xs text-gray-500 font-mono bg-gray-100 p-2 rounded break-all">{expectedContractId}</p>
              <Input
                id="confirm-contract-id"
                value={confirmContractId}
                onChange={(e) => setConfirmContractId(e.target.value)}
                placeholder="Recopiez l'ID du contrat"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-client-name" className="text-sm font-semibold text-gray-900">
                Nom du client
              </Label>
              <p className="text-xs text-gray-500 font-mono bg-gray-100 p-2 rounded">{expectedClientName || '—'}</p>
              <Input
                id="confirm-client-name"
                value={confirmClientName}
                onChange={(e) => setConfirmClientName(e.target.value)}
                placeholder="Recopiez le nom du client"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={deleteContract.isPending}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={deleteContract.isPending || !canConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteContract.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Suppression...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer définitivement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
