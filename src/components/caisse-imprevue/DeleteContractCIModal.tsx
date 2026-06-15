'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useContractCIMutations } from '@/domains/financial/caisse-imprevue/hooks/useContractCIMutations'
import type { ContractCI } from '@/types/types'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface DeleteContractCIModalProps {
  isOpen: boolean
  onClose: () => void
  contract: ContractCI | null
  onSuccess?: () => void
}

export default function DeleteContractCIModal({
  isOpen,
  onClose,
  contract,
  onSuccess,
}: DeleteContractCIModalProps) {
  const [confirmContractId, setConfirmContractId] = useState('')
  const { deleteContract } = useContractCIMutations()

  useEffect(() => {
    if (isOpen) {
      setConfirmContractId('')
    }
  }, [isOpen, contract])

  const handleSubmit = async () => {
    if (!contract) return
    if (confirmContractId.trim() !== contract.id) {
      toast.error("L'ID du contrat ne correspond pas")
      return
    }

    try {
      await deleteContract.mutateAsync(contract.id)
      onSuccess?.()
      onClose()
    } catch {
      // Erreur gérée par le hook (toast)
    }
  }

  if (!contract) return null
  const canConfirm = confirmContractId.trim() === contract.id

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <ModalContent size="lg">
        <ModalHeader
          icon={Trash2}
          tone="destructive"
          title="Supprimer le contrat"
          description="Cette action est irréversible. Le contrat et les documents liés seront définitivement supprimés."
        />

        <ModalBody>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold">Attention : suppression définitive</p>
              <p className="mt-2">
                Vous êtes sur le point de supprimer le contrat de <strong>{contract.memberFirstName} {contract.memberLastName}</strong> (contrat #{contract.id.slice(-8)}).
                Cette action ne peut pas être annulée.
              </p>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="confirm-contract-id" className="text-sm font-semibold text-gray-900">
              ID du contrat à supprimer
            </Label>
            <p className="text-xs text-gray-500 font-mono bg-gray-100 p-2 rounded break-all">{contract.id}</p>
            <Input
              id="confirm-contract-id"
              value={confirmContractId}
              onChange={(e) => setConfirmContractId(e.target.value)}
              placeholder="Collez l'ID du contrat"
              className="font-mono"
            />
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
                Supprimer
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
