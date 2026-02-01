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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { CaisseSpecialeDemand } from '@/types/types'
import { useCaisseSpecialeDemandMutations } from '@/hooks/caisse-speciale/useCaisseSpecialeDemands'
import { toast } from 'sonner'

interface DeleteDemandModalProps {
  isOpen: boolean
  onClose: () => void
  demand: CaisseSpecialeDemand | null
  memberMatricule?: string
  onSuccess?: () => void
}

export default function DeleteDemandModal({
  isOpen,
  onClose,
  demand,
  memberMatricule,
  onSuccess,
}: DeleteDemandModalProps) {
  const [confirmDemandId, setConfirmDemandId] = useState('')
  const [confirmMatricule, setConfirmMatricule] = useState('')
  const { deleteDemand } = useCaisseSpecialeDemandMutations()

  React.useEffect(() => {
    if (isOpen) {
      setConfirmDemandId('')
      setConfirmMatricule('')
    }
  }, [isOpen, demand])

  const handleSubmit = async () => {
    if (!demand) return

    const expectedDemandId = demand.id
    const expectedMatricule = memberMatricule || demand.memberId || ''

    if (confirmDemandId.trim() !== expectedDemandId) {
      toast.error('L\'ID de la demande ne correspond pas')
      return
    }
    if (confirmMatricule.trim() !== expectedMatricule) {
      toast.error('Le matricule du demandeur ne correspond pas')
      return
    }

    try {
      await deleteDemand.mutateAsync(demand.id)
      onSuccess?.()
      onClose()
    } catch (error: unknown) {
      console.error('Erreur lors de la suppression:', error)
    }
  }

  if (!demand) return null

  const expectedDemandId = demand.id
  const expectedMatricule = memberMatricule || demand.memberId || ''
  const isDemandIdMatch = confirmDemandId.trim() === expectedDemandId
  const isMatriculeMatch = confirmMatricule.trim() === expectedMatricule
  const canConfirm = isDemandIdMatch && isMatriculeMatch

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-red-600 flex items-center gap-2">
            <Trash2 className="h-6 w-6" />
            Supprimer définitivement la demande
          </DialogTitle>
          <DialogDescription>
            Cette action est irréversible. La demande ne pourra pas être récupérée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold">Attention : suppression définitive</p>
              <p className="mt-2">
                En confirmant, vous supprimez définitivement cette demande. Cette action ne peut pas être annulée et les données ne pourront pas être récupérées.
              </p>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Pour confirmer la suppression, recopiez exactement les informations suivantes :
            </p>

            <div className="space-y-2">
              <Label htmlFor="confirm-demand-id" className="text-sm font-semibold text-gray-900">
                ID de la demande à supprimer
              </Label>
              <p className="text-xs text-gray-500 font-mono bg-gray-100 p-2 rounded">
                {expectedDemandId}
              </p>
              <Input
                id="confirm-demand-id"
                value={confirmDemandId}
                onChange={(e) => setConfirmDemandId(e.target.value)}
                placeholder="Recopiez l'ID de la demande"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-matricule" className="text-sm font-semibold text-gray-900">
                Matricule du demandeur
              </Label>
              <p className="text-xs text-gray-500 font-mono bg-gray-100 p-2 rounded">
                {expectedMatricule}
              </p>
              <Input
                id="confirm-matricule"
                value={confirmMatricule}
                onChange={(e) => setConfirmMatricule(e.target.value)}
                placeholder="Recopiez le matricule du demandeur"
                className="font-mono"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deleteDemand.isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={deleteDemand.isPending || !canConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteDemand.isPending ? (
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
