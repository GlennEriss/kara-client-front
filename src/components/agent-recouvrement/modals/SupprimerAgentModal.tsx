'use client'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import type { AgentRecouvrement } from '@/types/types'
import type { UseMutationResult } from '@tanstack/react-query'
import { Loader2, Trash2 } from 'lucide-react'

interface SupprimerAgentModalProps {
  agent: AgentRecouvrement
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  mutation: UseMutationResult<boolean, Error, string>
}

export function SupprimerAgentModal({ agent, open, onOpenChange, onSuccess, mutation }: SupprimerAgentModalProps) {
  const handleConfirm = async () => {
    await mutation.mutateAsync(agent.id)
    onSuccess()
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      icon={Trash2}
      tone="destructive"
      title="Supprimer l'agent"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmer la suppression
          </Button>
        </>
      }
    >
      <p className="text-destructive font-semibold">⚠️ ATTENTION : Suppression irréversible</p>
      <p>
        Vous êtes sur le point de <strong>supprimer définitivement</strong> l'agent : <strong>{agent.nom} {agent.prenom}</strong>
      </p>
      <p className="text-sm">
        La suppression est <strong>irréversible</strong>. L'agent et toutes ses données seront supprimés de la base.
      </p>
      <p className="text-sm">
        Les versements déjà enregistrés avec cet agent garderont la référence mais l'agent n'existera plus.
      </p>
      <p>Cette action ne peut pas être annulée. Êtes-vous absolument sûr ?</p>
    </Modal>
  )
}
