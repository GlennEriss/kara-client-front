/**
 * Modal de paiement V2 pour une demande d'adhésion
 * 
 * Suit les diagrammes de séquence et la logique métier
 */

'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CreditCard, Loader2 } from 'lucide-react'
import { useState } from 'react'
import type { PaymentMode } from '@/types/types'
import { PAYMENT_MODE_LABELS } from '@/constantes/membership-requests'

interface PaymentModalV2Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: {
    amount: number
    mode: PaymentMode
    date: string
    time?: string
    paymentType?: 'Membership' | 'Subscription' | 'Tontine' | 'Charity'
    withFees?: boolean
  }) => Promise<void>
  requestId: string
  memberName: string
  isLoading?: boolean
}

const VALID_PAYMENT_MODES: PaymentMode[] = ['airtel_money', 'mobicash', 'cash', 'bank_transfer', 'other']
const DEFAULT_AMOUNT = 25000

export function PaymentModalV2({
  isOpen,
  onClose,
  onConfirm,
  requestId,
  memberName,
  isLoading = false,
}: PaymentModalV2Props) {
  const [amount, setAmount] = useState<string>(DEFAULT_AMOUNT.toString())
  const [mode, setMode] = useState<PaymentMode | ''>('')
  const [date, setDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [time, setTime] = useState<string>('')
  const [paymentType, setPaymentType] = useState<'Membership' | 'Subscription' | 'Tontine' | 'Charity'>('Membership')
  const [withFees, setWithFees] = useState<boolean>(false)

  const amountNum = parseFloat(amount) || 0
  const isValid = amountNum > 0 && VALID_PAYMENT_MODES.includes(mode as PaymentMode)

  const handleConfirm = async () => {
    if (!isValid) {
      return
    }

    await onConfirm({
      amount: amountNum,
      mode: mode as PaymentMode,
      date: date || new Date().toISOString(),
      time: time.trim() || undefined,
      paymentType,
      withFees,
    })
  }

  const handleClose = () => {
    if (!isLoading) {
      setAmount(DEFAULT_AMOUNT.toString())
      setMode('')
      setDate(new Date().toISOString().split('T')[0])
      setTime('')
      setPaymentType('Membership')
      setWithFees(false)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-kara-primary-dark">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Enregistrer un paiement
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Vous êtes sur le point d'enregistrer un paiement pour la demande de <strong>{memberName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Montant */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-semibold text-kara-primary-dark">
              Montant (FCFA) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="25000"
              disabled={isLoading}
              className="h-10"
              min="0"
              step="100"
            />
          </div>

          {/* Mode de paiement */}
          <div className="space-y-2">
            <Label htmlFor="mode" className="text-sm font-semibold text-kara-primary-dark">
              Mode de paiement <span className="text-red-500">*</span>
            </Label>
            <Select
              value={mode}
              onValueChange={(value) => setMode(value as PaymentMode)}
              disabled={isLoading}
            >
              <SelectTrigger id="mode" className="h-10">
                <SelectValue placeholder="Sélectionner un mode de paiement" />
              </SelectTrigger>
              <SelectContent>
                {VALID_PAYMENT_MODES.map((paymentMode) => (
                  <SelectItem key={paymentMode} value={paymentMode}>
                    {PAYMENT_MODE_LABELS[paymentMode] || paymentMode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-semibold text-gray-700">
              Date de paiement <span className="text-red-500">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isLoading}
              className="h-10"
            />
          </div>

          {/* Heure (optionnel) */}
          <div className="space-y-2">
            <Label htmlFor="time" className="text-sm font-semibold text-gray-700">
              Heure (optionnel)
            </Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={isLoading}
              className="h-10"
            />
          </div>

          {/* Type de paiement */}
          <div className="space-y-2">
            <Label htmlFor="paymentType" className="text-sm font-semibold text-gray-700">
              Type de paiement
            </Label>
            <Select
              value={paymentType}
              onValueChange={(value) => setPaymentType(value as any)}
              disabled={isLoading}
            >
              <SelectTrigger id="paymentType" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Membership">Adhésion</SelectItem>
                <SelectItem value="Subscription">Souscription</SelectItem>
                <SelectItem value="Tontine">Tontine</SelectItem>
                <SelectItem value="Charity">Bienfaisance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="border-gray-300"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !isValid}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement en cours...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Enregistrer le paiement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
