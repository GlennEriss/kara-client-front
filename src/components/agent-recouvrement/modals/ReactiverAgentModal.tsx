'use client'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useAuth } from '@/hooks/useAuth'
import type { AgentRecouvrement } from '@/types/types'
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
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Réactiver l'agent"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button className="bg-[#234D65] hover:bg-[#2c5a73]" onClick={handleConfirm} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmer
          </Button>
        </>
      }
    >
      <p>
        Vous êtes sur le point de réactiver l'agent : <strong>{agent.nom} {agent.prenom}</strong>
      </p>
      <p className="text-sm text-muted-foreground">
        L'agent sera de nouveau disponible dans les selects de versement.
      </p>
      <p>Confirmer ?</p>
    </Modal>
  )
}
