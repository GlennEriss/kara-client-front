'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateSubscription } from '@/db/subscription.db'
import { computeSubscriptionPeriod } from '@/domains/memberships/utils/subscriptionPeriod'
import { useAuditLogger } from '@/hooks/useAuditLog'
import type { Subscription } from '@/types/types'
import { Calendar, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

/** `YYYY-MM-DD` attendu par l'input date, en heure locale. */
function toInputDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatShort = (date: Date) => date.toLocaleDateString('fr-FR')

/**
 * Correction de la période d'un abonnement déjà enregistré.
 *
 * La date de fin est recalculée à partir du début, comme à la création : deux
 * champs libres laisseraient créer des périodes incohérentes, et le seul besoin
 * réel est de rattraper une date de début erronée.
 */
export function EditSubscriptionPeriodModal({
  isOpen,
  onClose,
  subscription,
  memberId,
  onUpdated,
}: {
  isOpen: boolean
  onClose: () => void
  subscription: Subscription | null
  memberId: string
  onUpdated: () => void | Promise<void>
}) {
  const [startDate, setStartDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { log } = useAuditLogger()

  useEffect(() => {
    if (isOpen && subscription) {
      setStartDate(toInputDate(new Date(subscription.dateStart)))
    }
  }, [isOpen, subscription])

  if (!subscription) return null

  let preview: { start: Date; end: Date } | null = null
  try {
    preview = startDate ? computeSubscriptionPeriod(startDate) : null
  } catch {
    preview = null
  }

  const hasChanged =
    preview !== null &&
    preview.start.getTime() !== new Date(subscription.dateStart).getTime()

  const handleSubmit = async () => {
    if (!preview) return
    try {
      setIsSubmitting(true)
      await updateSubscription(subscription.id, {
        dateStart: preview.start,
        dateEnd: preview.end,
      })

      log({
        action: 'update',
        module: 'members',
        moduleLabel: 'Membres',
        targetType: 'abonnement',
        targetId: subscription.id,
        description: `Correction de la période d’un abonnement : ${formatShort(preview.start)} → ${formatShort(preview.end)}`,
        metadata: {
          memberId,
          previousStart: new Date(subscription.dateStart).toISOString(),
          previousEnd: new Date(subscription.dateEnd).toISOString(),
          newStart: preview.start.toISOString(),
          newEnd: preview.end.toISOString(),
        },
      })

      toast.success('Période de l’abonnement corrigée')
      await onUpdated()
      onClose()
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la correction de la période')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#234D65]" />
            Corriger la période
          </DialogTitle>
          <DialogDescription>
            Période actuelle : du {formatShort(new Date(subscription.dateStart))} au{' '}
            {formatShort(new Date(subscription.dateEnd))}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="subscription-start-date" className="mb-2 block text-sm font-semibold">
              Date de début *
            </Label>
            <Input
              id="subscription-start-date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {preview && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-sm text-blue-800">
                Nouvelle période : du <strong>{formatShort(preview.start)}</strong> au{' '}
                <strong>{formatShort(preview.end)}</strong>. La date de fin est recalculée
                automatiquement, un an après le début.
              </AlertDescription>
            </Alert>
          )}

          {startDate && !preview && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-sm text-red-800">
                Date invalide.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanged || isSubmitting}
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Correction...
              </>
            ) : (
              'Corriger'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
