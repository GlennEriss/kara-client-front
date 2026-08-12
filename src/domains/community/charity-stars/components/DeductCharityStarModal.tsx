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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, Loader2, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDeductCharityStar } from '../hooks/useCharityStars'

const MIN_REASON_LENGTH = 10

/**
 * Retrait d'une étoile. Le motif est obligatoire — le retrait est définitif et
 * consigné : pour corriger une erreur, il faudra une nouvelle donation, pas une
 * annulation.
 */
export function DeductCharityStarModal({
  isOpen,
  onClose,
  memberId,
  memberName,
  currentStars,
}: {
  isOpen: boolean
  onClose: () => void
  memberId: string
  memberName: string
  currentStars: number
}) {
  const [reason, setReason] = useState('')
  const deduct = useDeductCharityStar()

  useEffect(() => {
    if (isOpen) setReason('')
  }, [isOpen])

  const trimmedReason = reason.trim()
  const canSubmit = trimmedReason.length >= MIN_REASON_LENGTH && currentStars > 0 && !deduct.isPending

  const handleSubmit = async () => {
    if (!canSubmit) return
    try {
      await deduct.mutateAsync({ memberId, reason: trimmedReason })
      onClose()
    } catch {
      // Le toast d'erreur est géré par la mutation.
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-[#CBB171]" />
            Retrancher une étoile
          </DialogTitle>
          <DialogDescription>
            {memberName} passera de {currentStars} à {Math.max(0, currentStars - 1)} étoile
            {currentStars - 1 > 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-800">
              Le retrait est définitif et conservé dans l’historique du membre. Il n’annule aucune
              donation : seul le solde d’étoiles est diminué.
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="deduct-star-reason" className="mb-2 block text-sm font-semibold">
              Motif du retrait *
            </Label>
            <Textarea
              id="deduct-star-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Expliquez la raison du retrait (minimum 10 caractères)"
              rows={4}
              disabled={deduct.isPending}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {trimmedReason.length} / {MIN_REASON_LENGTH} caractères minimum
            </p>
          </div>

          {currentStars <= 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-sm text-red-800">
                Ce membre n’a aucune étoile à retrancher.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deduct.isPending}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} variant="destructive">
            {deduct.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Retrait...
              </>
            ) : (
              'Retrancher l’étoile'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
