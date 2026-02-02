'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { AgentRecouvrement } from '@/types/types'
import { useAuth } from '@/hooks/useAuth'
import type { UseMutationResult } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

interface ReactiverAgentModalProps {
  agent: AgentRecouvrement
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  mutation: UseMutationResult<boolean, Error, { id: string; updatedBy: string }>
}

export function ReactiverAgentModal({ agent, open, onOpenChange, onSuccess, mutation }: ReactiverAgentModalProps) {
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
          <DialogTitle>Réactiver l'agent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>
            Vous êtes sur le point de réactiver l'agent : <strong>{agent.nom} {agent.prenom}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            L'agent sera de nouveau disponible dans les selects de versement.
          </p>
          <p>Confirmer ?</p>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button className="bg-[#234D65] hover:bg-[#2c5a73]" onClick={handleConfirm} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
