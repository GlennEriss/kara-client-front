'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { useContractCIMutations } from '@/domains/financial/caisse-imprevue/hooks/useContractCIMutations'
import type { ContractCI } from '@/types/types'

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
  const { deleteContract } = useContractCIMutations()

  const handleSubmit = async () => {
    if (!contract) return
    try {
      await deleteContract.mutateAsync(contract.id)
      onSuccess?.()
      onClose()
    } catch {
      // Erreur gérée par le hook (toast)
    }
  }

  if (!contract) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Supprimer le contrat
          </DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Le contrat et les documents liés seront définitivement supprimés.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={deleteContract.isPending}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={deleteContract.isPending}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
