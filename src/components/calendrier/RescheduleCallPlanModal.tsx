'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRescheduleCallPlan } from '@/hooks/useCallPlans'
import { callPlanDateShortcuts, isValidCallPlanDate } from '@/utils/call-plan-dates'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { CallPlanDatePicker } from './CallPlanDatePicker'

export type RescheduleTarget = { id: string; batchId?: never; label: string; scheduledDate: string } | { batchId: string; id?: never; label: string; scheduledDate: string }

export function RescheduleCallPlanModal({ target, onClose, onRescheduled }: {
  target: RescheduleTarget; onClose: () => void; onRescheduled: (date: string) => void
}) {
  const [date, setDate] = useState(callPlanDateShortcuts()[1].value)
  const [reason, setReason] = useState('')
  const mutation = useRescheduleCallPlan()
  const submit = async () => {
    try {
      const count = target.id !== undefined
        ? await mutation.mutateAsync({ id: target.id, scheduledDate: date, reason })
        : await mutation.mutateAsync({ batchId: target.batchId, scheduledDate: date, reason })
      toast.success(count ? `${count} appel(s) replanifié(s). L’attribution est conservée.` : 'Aucun appel à déplacer : dates identiques ou appels déjà terminés.')
      onRescheduled(date)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'La replanification a échoué. Actualisez le planning avant de réessayer.')
    }
  }
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Replanifier {target.id ? 'l’appel' : 'le lot'}</DialogTitle>
          <DialogDescription>{target.label}. Les appels terminés restent dans l&apos;historique ; seuls les appels à faire sont déplacés.</DialogDescription>
        </DialogHeader>
        <fieldset disabled={mutation.isPending} className="space-y-4">
          <CallPlanDatePicker id="reschedule-date" value={date} onChange={setDate} />
          <div className="space-y-2">
            <Label htmlFor="reschedule-reason">Motif du report (facultatif)</Label>
            <Textarea id="reschedule-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex. : attend son salaire" />
          </div>
        </fieldset>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Annuler</Button>
          <Button onClick={submit} disabled={mutation.isPending || !isValidCallPlanDate(date) || (!!target.id && date === target.scheduledDate)}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Replanifier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
