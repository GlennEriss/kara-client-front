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
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useRecordGuarantorPayment } from '@/hooks/useCreditSpeciale'
import type { GuarantorPayment } from '@/types/types'
import { format } from 'date-fns'
import { CalendarClock, DollarSign, FileText, Landmark, MessageSquareText, Upload } from 'lucide-react'
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
      <ModalContent className="w-[calc(100vw-1.5rem)] max-w-xl">
          <ModalHeader
            icon={Landmark}
            title="Enregistrer un paiement au garant"
            description="Renseignez les informations du versement et ajoutez la preuve de paiement."
          />
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <ModalBody className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CalendarClock className="h-4 w-4 text-[#234D65]" />
                  Détails du paiement
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="gp-date">Date du paiement *</Label>
                    <Input
                      id="gp-date"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gp-time">Heure *</Label>
                    <Input
                      id="gp-time"
                      type="time"
                      value={paymentTime}
                      onChange={(e) => setPaymentTime(e.target.value)}
                      required
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <DollarSign className="h-4 w-4 text-[#234D65]" />
                  Montant et moyen de paiement
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="gp-amount">Montant (FCFA) *</Label>
                    <div className="relative">
                      <Input
                        id="gp-amount"
                        type="number"
                        min="1"
                        step="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        required
                        className="bg-white pr-16"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                        FCFA
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Moyen de paiement *</Label>
                    <Select value={mode} onValueChange={(v) => setMode(v as GuarantorPayment['mode'])}>
                      <SelectTrigger className="bg-white">
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
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Upload className="h-4 w-4 text-[#234D65]" />
                  Preuve de paiement (recommandé)
                </div>
                <Input
                  id="gp-proof"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0])}
                  className="bg-white file:mr-3 file:rounded-md file:border-0 file:bg-[#234D65] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#1b3b4d]"
                />
                {proofFile ? (
                  <p className="mt-2 flex items-start gap-2 break-all text-sm text-slate-600">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#234D65]" />
                    {proofFile.name}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">
                    Formats acceptés: image ou PDF.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <MessageSquareText className="h-4 w-4 text-[#234D65]" />
                  Informations complémentaires
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="gp-reference">Référence (optionnel)</Label>
                    <Input
                      id="gp-reference"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="N° transaction, référence virement..."
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gp-comment">Commentaire (optionnel)</Label>
                    <Textarea
                      id="gp-comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Note libre"
                      rows={3}
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>
            </ModalBody>

            <ModalFooter className="sm:justify-between">
              <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={recordPayment.isPending}
                className="w-full bg-[#234D65] hover:bg-[#1a3b4f] sm:w-auto"
              >
                {recordPayment.isPending ? 'Enregistrement...' : 'Enregistrer le paiement'}
              </Button>
            </ModalFooter>
          </form>
      </ModalContent>
    </Dialog>
  )
}
