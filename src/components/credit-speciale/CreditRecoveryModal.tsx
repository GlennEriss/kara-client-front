'use client'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { CreditPaymentMode } from '@/types/types'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

const MODES: Array<{ value: CreditPaymentMode; label: string }> = [
  { value: 'cash', label: 'Espèces' },
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'mobicash', label: 'Mobicash' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
]

/** Enregistre une somme récupérée auprès du membre après une clôture en perte. */
export default function CreditRecoveryModal({
  isOpen,
  onClose,
  maxAmount,
  onConfirm,
  isPending = false,
}: {
  isOpen: boolean
  onClose: () => void
  /** Perte restante : on ne peut pas récupérer plus. */
  maxAmount: number
  onConfirm: (data: { amount: number; date: Date; mode: CreditPaymentMode; comment?: string }) => Promise<void>
  isPending?: boolean
}) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [mode, setMode] = useState<CreditPaymentMode>('cash')
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  const value = Math.round(Number(amount) || 0)
  const parsedDate = new Date(`${date}T12:00:00`)
  const isValid = value > 0 && value <= maxAmount && !Number.isNaN(parsedDate.getTime())

  const reset = () => {
    setAmount('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setMode('cash')
    setComment('')
    setError(null)
  }

  const handleClose = () => {
    if (isPending) return
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (!isValid) return
    setError(null)
    try {
      await onConfirm({ amount: value, date: parsedDate, mode, comment: comment.trim() || undefined })
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <ModalContent size="sm">
        <ModalHeader
          title="Enregistrer une récupération"
          description={`Somme versée par le membre après la clôture en perte. Perte restante : ${maxAmount.toLocaleString('fr-FR')} FCFA.`}
        />
        <ModalBody>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="recovery-amount">Montant (FCFA)</Label>
                <Input
                  id="recovery-amount"
                  type="number"
                  min={1}
                  max={maxAmount}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recovery-date">Date</Label>
                <Input id="recovery-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Moyen de paiement</Label>
              <Select value={mode} onValueChange={(next) => setMode(next as CreditPaymentMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recovery-comment">Commentaire (optionnel)</Label>
              <Textarea id="recovery-comment" value={comment} onChange={(event) => setComment(event.target.value)} rows={3} />
            </div>
            {value > maxAmount && <p className="text-sm text-red-600">Le montant dépasse la perte restante.</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Annuler
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!isValid || isPending} className="bg-[#234D65] hover:bg-[#1a3a4d]">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enregistrer
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
