'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { AgentRecouvrement } from '@/types/types'
import { useAuth } from '@/hooks/useAuth'
import type { UseMutationResult } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

interface DesactiverAgentModalProps {
  agent: AgentRecouvrement
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  mutation: UseMutationResult<boolean, Error, { id: string; updatedBy: string }>
}

export function DesactiverAgentModal({ agent, open, onOpenChange, onSuccess, mutation }: DesactiverAgentModalProps) {
  const { user } = useAuth()

  const handleConfirm = async () => {
    if (!user?.uid) return
    await mutation.mutateAsync({ id: agent.id, updatedBy: user.uid })
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Désactiver l'agent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>
            Vous êtes sur le point de désactiver l'agent : <strong>{agent.nom} {agent.prenom}</strong>
          </p>
          <p className="text-sm text-amber-600">
            ⚠️ L'agent ne sera plus disponible dans les selects de versement. L'historique reste lié (traçabilité).
          </p>
          <p>Êtes-vous sûr ?</p>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
