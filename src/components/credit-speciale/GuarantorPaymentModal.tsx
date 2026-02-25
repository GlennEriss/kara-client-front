'use client'

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useRecordGuarantorPayment } from '@/hooks/useCreditSpeciale'
import type { GuarantorPayment } from '@/types/types'
import { format } from 'date-fns'
import { DollarSign, Upload } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

interface GuarantorPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  creditId: string
  onSuccess?: () => void
}

const PAYMENT_MODE_OPTIONS: { value: GuarantorPayment['mode']; label: string }[] = [
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'mobicash', label: 'Mobicash' },
  { value: 'cash', label: 'Espèce' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
]

export default function GuarantorPaymentModal({
  isOpen,
  onClose,
  creditId,
  onSuccess,
}: GuarantorPaymentModalProps) {
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [paymentTime, setPaymentTime] = useState(format(new Date(), 'HH:mm'))
  const [amount, setAmount] = useState<string>('')
  const [mode, setMode] = useState<GuarantorPayment['mode']>('airtel_money')
  const [reference, setReference] = useState('')
  const [comment, setComment] = useState('')
  const [proofFile, setProofFile] = useState<File | undefined>()

  const recordPayment = useRecordGuarantorPayment()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amountNum = Number(amount)
    if (!amountNum || amountNum <= 0) {
      toast.error('Veuillez saisir un montant valide')
      return
    }
    const [hours, minutes] = paymentTime.split(':').map(Number)
    const date = new Date(paymentDate)
    date.setHours(hours, minutes, 0, 0)
    try {
      await recordPayment.mutateAsync({
        creditId,
        paymentDate: date,
        paymentTime,
        amount: amountNum,
        mode,
        reference: reference || undefined,
        comment: comment || undefined,
        proofFile,
      })
      onSuccess?.()
      handleClose()
    } catch {
      // toast géré dans le hook
    }
  }

  const handleClose = () => {
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'))
    setPaymentTime(format(new Date(), 'HH:mm'))
    setAmount('')
    setMode('airtel_money')
    setReference('')
    setComment('')
    setProofFile(undefined)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement au garant</DialogTitle>
          <DialogDescription>
            Saisissez les informations du versement effectué au garant et la preuve (recommandé).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gp-date">Date du paiement *</Label>
              <Input
                id="gp-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="gp-time">Heure *</Label>
              <Input
                id="gp-time"
                type="time"
                value={paymentTime}
                onChange={(e) => setPaymentTime(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="gp-amount" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Montant (FCFA) *
            </Label>
            <Input
              id="gp-amount"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
            />
          </div>
          <div>
            <Label>Moyen de paiement *</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as GuarantorPayment['mode'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="gp-proof" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Preuve (recommandé)
            </Label>
            <Input
              id="gp-proof"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setProofFile(e.target.files?.[0])}
            />
            {proofFile && (
              <p className="text-sm text-gray-600 mt-1">Fichier : {proofFile.name}</p>
            )}
          </div>
          <div>
            <Label htmlFor="gp-reference">Référence (optionnel)</Label>
            <Input
              id="gp-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="N° transaction, référence virement..."
            />
          </div>
          <div>
            <Label htmlFor="gp-comment">Commentaire (optionnel)</Label>
            <Textarea
              id="gp-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Note libre"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={recordPayment.isPending}>
              {recordPayment.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
