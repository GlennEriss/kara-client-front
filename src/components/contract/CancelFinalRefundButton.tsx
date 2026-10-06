'use client'

import { useState } from 'react'
import { Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cancelFinalRefund } from '@/services/caisse/mutations'

interface Props {
  contractId: string
  refundId: string
  onDone?: () => void | Promise<void>
  /** Bouton réduit, pour les listes d'actions en ligne. */
  compact?: boolean
}

/**
 * Refus / annulation d'un remboursement final non payé, avec motif obligatoire.
 * Une fois annulé, une nouvelle demande de remboursement final peut être faite.
 */
export default function CancelFinalRefundButton({ contractId, refundId, onDone, compact = false }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = () => {
    if (isSubmitting) return
    setOpen(false)
    setReason('')
  }

  const handleConfirm = async () => {
    if (!reason.trim()) return
    setIsSubmitting(true)
    try {
      await cancelFinalRefund(contractId, refundId, reason)
      toast.success('Remboursement final annulé')
      setOpen(false)
      setReason('')
      await onDone?.()
    } catch (e: any) {
      toast.error(e?.message || 'Annulation impossible')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size={compact ? 'sm' : 'default'}
        className={`${compact ? 'gap-1.5' : 'w-full gap-2'} border-red-300 text-red-600 hover:bg-red-50 flex items-center justify-center`}
        onClick={() => setOpen(true)}
      >
        <XCircle className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        {compact ? 'Refuser / annuler' : 'Refuser / annuler le remboursement final'}
      </Button>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser / annuler le remboursement final</DialogTitle>
            <DialogDescription>
              La demande sera archivée avec son motif. Une nouvelle demande de remboursement final pourra ensuite être faite.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif du refus ou de l'annulation"
            rows={4}
            disabled={isSubmitting}
          />
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Retour
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirm}
              disabled={isSubmitting || !reason.trim()}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
