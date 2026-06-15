'use client'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useAuth } from '@/hooks/useAuth'
import type { AgentRecouvrement } from '@/types/types'
import type { UseMutationResult } from '@tanstack/react-query'
import { AlertTriangle, Loader2 } from 'lucide-react'

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
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      icon={AlertTriangle}
      tone="destructive"
      title="Désactiver l'agent"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmer
          </Button>
        </>
      }
    >
      <p>
        Vous êtes sur le point de désactiver l'agent : <strong>{agent.nom} {agent.prenom}</strong>
      </p>
      <p className="text-sm text-amber-600">
        ⚠️ L'agent ne sera plus disponible dans les selects de versement. L'historique reste lié (traçabilité).
      </p>
      <p>Êtes-vous sûr ?</p>
    </Modal>
  )
}
