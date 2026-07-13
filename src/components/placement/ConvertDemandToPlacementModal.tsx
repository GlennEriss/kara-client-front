'use client'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { convertDemandToPlacementSchema, type ConvertDemandToPlacementInput } from '@/schemas/placement.schema'
import type { PaymentMode, PlacementDemand } from '@/types/types'
import { CreditCard, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

interface ConvertDemandToPlacementModalProps {
  isOpen: boolean
  demand: PlacementDemand | null
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: (data: ConvertDemandToPlacementInput) => Promise<void>
}

const PAYMENT_MODE_OPTIONS: Array<{ value: PaymentMode; label: string }> = [
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'mobicash', label: 'Mobicash' },
  { value: 'cash', label: 'Espèce' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
  { value: 'other', label: 'Autres' },
]

function getCurrentTimeHHmm() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export default function ConvertDemandToPlacementModal({
  isOpen,
  demand,
  isSubmitting = false,
  onClose,
  onConfirm,
}: ConvertDemandToPlacementModalProps) {
  const initialDate = useMemo(() => {
    if (!demand?.desiredDate) return new Date().toISOString().slice(0, 10)
    return demand.desiredDate
  }, [demand?.desiredDate])

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('airtel_money')
  const [withFees, setWithFees] = useState<boolean | undefined>(undefined)
  const [paymentMethodOther, setPaymentMethodOther] = useState('')
  const [handoverLocation, setHandoverLocation] = useState('')
  const [handoverDate, setHandoverDate] = useState(initialDate)
  const [handoverTime, setHandoverTime] = useState(getCurrentTimeHHmm())

  useEffect(() => {
    if (!isOpen) return
    setPaymentMode('airtel_money')
    setWithFees(undefined)
    setPaymentMethodOther('')
    setHandoverLocation('')
    setHandoverDate(initialDate)
    setHandoverTime(getCurrentTimeHHmm())
  }, [isOpen, initialDate])

  const isMobileMoney = paymentMode === 'airtel_money' || paymentMode === 'mobicash'

  const handleSubmit = async () => {
    if (!demand) return

    const payload: ConvertDemandToPlacementInput = {
      paymentMode,
      withFees,
      paymentMethodOther: paymentMethodOther.trim(),
      handoverLocation: handoverLocation.trim(),
      handoverDate,
      handoverTime,
    }

    try {
      convertDemandToPlacementSchema.parse(payload)
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0]?.message || 'Formulaire invalide')
        return
      }
      toast.error('Formulaire invalide')
      return
    }

    await onConfirm(payload)
  }

  if (!demand) return null

  return (
    <Dialog open={isOpen} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <ModalContent size="lg">
        <ModalHeader
          icon={CreditCard}
          title="Créer le placement"
          description="Complétez les informations de remise avant de convertir la demande en placement actif."
        />

        <ModalBody>
          <div className="space-y-2">
            <Label>Moyen de paiement</Label>
            <Select
              value={paymentMode}
              onValueChange={(value: PaymentMode) => {
                setPaymentMode(value)
                if (value !== 'airtel_money' && value !== 'mobicash') setWithFees(undefined)
                if (value !== 'other') setPaymentMethodOther('')
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un moyen de paiement" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isMobileMoney && (
            <div className="space-y-2">
              <Label>Frais mobile money</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={withFees === true ? 'default' : 'outline'}
                  className={withFees === true ? 'bg-[#234D65] hover:bg-[#1d4054]' : ''}
                  onClick={() => setWithFees(true)}
                >
                  Avec frais
                </Button>
                <Button
                  type="button"
                  variant={withFees === false ? 'default' : 'outline'}
                  className={withFees === false ? 'bg-[#234D65] hover:bg-[#1d4054]' : ''}
                  onClick={() => setWithFees(false)}
                >
                  Sans frais
                </Button>
              </div>
            </div>
          )}

          {paymentMode === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="payment-method-other">Nom du moyen de paiement</Label>
              <Input
                id="payment-method-other"
                value={paymentMethodOther}
                onChange={(e) => setPaymentMethodOther(e.target.value)}
                placeholder="Ex: Wave, Orange Money..."
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="handover-location">Lieu de remise</Label>
            <Input
              id="handover-location"
              value={handoverLocation}
              onChange={(e) => setHandoverLocation(e.target.value)}
              placeholder="Ex: Agence Kara - Libreville"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="handover-date">Date de remise</Label>
              <Input
                id="handover-date"
                type="date"
                value={handoverDate}
                onChange={(e) => setHandoverDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handover-time">Heure de remise</Label>
              <Input
                id="handover-time"
                type="time"
                value={handoverTime}
                onChange={(e) => setHandoverTime(e.target.value)}
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="flex-col-reverse gap-2 sm:flex-row [&>button]:w-full sm:[&>button]:w-auto">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#234D65] hover:bg-[#1d4054]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Création...
              </>
            ) : (
              'Créer le placement'
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}

