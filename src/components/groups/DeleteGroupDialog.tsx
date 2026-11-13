'use client'

import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Group } from '@/types/types'

export function DeleteGroupDialog({ group, onClose, onDeleted }: { group: Group; onClose: () => void; onDeleted: () => Promise<void> | void }) {
  const [confirmation, setConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const remove = async () => {
    if (pending || confirmation.trim() !== group.id) return
    setPending(true)
    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(group.id)}/deletion`, {
        method: 'DELETE', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationId: confirmation.trim() }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Suppression impossible')
      toast.success('Groupe supprimé')
      await onDeleted()
      onClose()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Suppression impossible') }
    finally { setPending(false) }
  }
  return <Dialog open onOpenChange={open => { if (!open && !pending) onClose() }}>
    <ModalContent size="lg" showCloseButton={!pending}>
      <ModalHeader icon={Trash2} tone="destructive" title="Supprimer le groupe" description="Suppression définitive réservée au SuperAdmin." />
      <ModalBody>
        <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p>Le groupe « <strong>{group.name}</strong> », ses projets, cotisations, remises et accords entre membres seront supprimés avec leurs justificatifs et leur historique interne.</p>
          <p>Les membres gardent leurs comptes et leurs autres groupes. Les contrats de caisse et de crédit restent dans leurs sections, avec une référence minimale au nom du groupe. Cette suppression ne constitue ni un remboursement ni une remise d’argent.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-group-id">Identifiant du groupe à supprimer</Label>
          <p className="break-all rounded-lg bg-gray-100 p-2 font-mono text-xs">{group.id}</p>
          <Input id="confirm-group-id" value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="Collez l’identifiant du groupe" disabled={pending} autoComplete="off" />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" disabled={pending} onClick={onClose}>Annuler</Button>
        <Button variant="destructive" disabled={pending || confirmation.trim() !== group.id} onClick={remove}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} {pending ? 'Suppression…' : 'Supprimer définitivement'}
        </Button>
      </ModalFooter>
    </ModalContent>
  </Dialog>
}
