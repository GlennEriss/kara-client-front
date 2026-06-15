'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreditContractMutations } from '@/hooks/useCreditSpeciale'
import type { CreditContract } from '@/types/types'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

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
  const { deleteContract } = useCreditContractMutations()

  useEffect(() => {
    if (isOpen) {
      setConfirmContractId('')
    }
  }, [isOpen, contract])

  const handleSubmit = async () => {
    if (!contract) return

    const expectedContractId = contract.id

    if (confirmContractId.trim() !== expectedContractId) {
      toast.error("L'ID du contrat ne correspond pas")
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
  const isContractIdMatch = confirmContractId.trim() === expectedContractId
  const canConfirm = isContractIdMatch

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <ModalContent size="lg">
        <ModalHeader
          icon={Trash2}
          tone="destructive"
          title="Supprimer définitivement le contrat"
          description="Cette action est irréversible. Le contrat ne pourra pas être récupéré."
        />

        <ModalBody className="space-y-6">
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
              Pour confirmer la suppression, collez exactement l&apos;ID suivant :
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
          </div>
        </ModalBody>

        <ModalFooter>
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
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
