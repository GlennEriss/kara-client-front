'use client'

import { AgentRecouvrementSelect } from '@/components/agent-recouvrement/AgentRecouvrementSelect'
import { Checkbox } from '@/components/ui/checkbox'
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
import { usePayCreditPenalty, useUpdateCreditPenaltyPayment } from '@/hooks/useCreditSpeciale'
import { ImageCompressionService } from '@/services/imageCompressionService'
import type { CreditPaymentMode, CreditPenalty } from '@/types/types'
import { format } from 'date-fns'
import { Loader2, Upload } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface CreditPenaltyPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  creditId: string
  penalty: CreditPenalty | null
  modalMode?: 'pay' | 'edit'
  onSuccess?: () => void
}

const PAYMENT_MODE_OPTIONS: Array<{ value: CreditPaymentMode; label: string }> = [
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'mobicash', label: 'Mobicash' },
  { value: 'cash', label: 'Espèce' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
]

export default function CreditPenaltyPaymentModal({
  isOpen,
  onClose,
  creditId,
  penalty,
  modalMode = 'pay',
  onSuccess,
}: CreditPenaltyPaymentModalProps) {
  const payPenalty = usePayCreditPenalty()
  const updatePenaltyPayment = useUpdateCreditPenaltyPayment()
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [paymentTime, setPaymentTime] = useState(format(new Date(), 'HH:mm'))
  const [mode, setMode] = useState<CreditPaymentMode>('airtel_money')
  const [withFees, setWithFees] = useState<boolean | undefined>(undefined)
  const [agentRecouvrementId, setAgentRecouvrementId] = useState('')
  const [comment, setComment] = useState('')
  const [proofFile, setProofFile] = useState<File | undefined>()
  const [isCompressing, setIsCompressing] = useState(false)
  const isEditMode = modalMode === 'edit'
  const activeMutation = isEditMode ? updatePenaltyPayment : payPenalty

  useEffect(() => {
    if (!isOpen) return
    if (isEditMode && penalty?.paid) {
      const paidAt = penalty.paidAt ? new Date(penalty.paidAt) : new Date()
      setPaymentDate(format(paidAt, 'yyyy-MM-dd'))
      setPaymentTime(penalty.paymentTime || format(paidAt, 'HH:mm'))
      setMode(penalty.paymentMode || 'airtel_money')
      setWithFees(
        penalty.paymentMode === 'airtel_money' || penalty.paymentMode === 'mobicash'
          ? penalty.withFees
          : undefined
      )
      setAgentRecouvrementId(penalty.agentRecouvrementId || '')
      setComment(penalty.paymentComment || '')
      setProofFile(undefined)
      setIsCompressing(false)
      return
    }

    setPaymentDate(format(new Date(), 'yyyy-MM-dd'))
    setPaymentTime(format(new Date(), 'HH:mm'))
    setMode('airtel_money')
    setWithFees(undefined)
    setAgentRecouvrementId('')
    setComment('')
    setProofFile(undefined)
    setIsCompressing(false)
  }, [isEditMode, isOpen, penalty])

  const handleClose = () => {
    onClose()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setProofFile(undefined)
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('La preuve de paiement doit être une image')
      e.target.value = ''
      return
    }

    try {
      setIsCompressing(true)
      const compressed = await ImageCompressionService.compressPaymentProofImage(file)
      setProofFile(compressed)
    } finally {
      setIsCompressing(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!penalty) {
      toast.error('Aucune pénalité sélectionnée')
      return
    }
    if (isEditMode && !penalty.paid) {
      toast.error('Cette pénalité doit déjà être payée pour être modifiée')
      return
    }
    if ((mode === 'airtel_money' || mode === 'mobicash') && withFees === undefined) {
      toast.error('Veuillez préciser si le paiement mobile money est avec frais ou sans frais')
      return
    }

    const [hours, minutes] = paymentTime.split(':').map(Number)
    const paidAt = new Date(paymentDate)
    paidAt.setHours(hours || 0, minutes || 0, 0, 0)

    try {
      await activeMutation.mutateAsync({
        penaltyId: penalty.id,
        creditId,
        paymentDate: paidAt,
        paymentTime,
        amount: penalty.amount,
        mode,
        withFees: mode === 'airtel_money' || mode === 'mobicash' ? withFees : undefined,
        agentRecouvrementId: agentRecouvrementId || undefined,
        comment: comment.trim() || undefined,
        proofFile,
      })
      onSuccess?.()
      handleClose()
    } catch {
      // toast géré dans le hook
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Modifier le paiement de la pénalité' : 'Payer une pénalité'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Mettez à jour les informations d’encaissement de cette pénalité payée.'
              : 'Enregistrez le paiement de cette pénalité avec sa preuve et ses informations d’encaissement.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="penalty-payment-date">Date de paiement *</Label>
              <Input
                id="penalty-payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="penalty-payment-time">Heure de paiement *</Label>
              <Input
                id="penalty-payment-time"
                type="time"
                value={paymentTime}
                onChange={(e) => setPaymentTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="penalty-amount">Montant de la pénalité</Label>
            <Input
              id="penalty-amount"
              type="text"
              value={penalty ? `${penalty.amount.toLocaleString('fr-FR')} FCFA` : ''}
              disabled
            />
          </div>

          <div>
            <Label>Moyen de paiement *</Label>
            <Select
              value={mode}
              onValueChange={(value) => {
                const paymentMode = value as CreditPaymentMode
                setMode(paymentMode)
                if (paymentMode !== 'airtel_money' && paymentMode !== 'mobicash') {
                  setWithFees(undefined)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
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

          {(mode === 'airtel_money' || mode === 'mobicash') && (
            <div>
              <Label className="mb-2 block">Options de frais *</Label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer transition-colors ${
                    withFees === true
                      ? 'border-[#234D65] bg-[#234D65]/5 text-[#234D65]'
                      : 'border-gray-200'
                  }`}
                >
                  <Checkbox
                    checked={withFees === true}
                    onCheckedChange={() => setWithFees(true)}
                    className="data-[state=checked]:border-[#234D65] data-[state=checked]:bg-[#234D65]"
                  />
                  <span className="text-sm">Avec frais</span>
                </label>
                <label
                  className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer transition-colors ${
                    withFees === false
                      ? 'border-[#234D65] bg-[#234D65]/5 text-[#234D65]'
                      : 'border-gray-200'
                  }`}
                >
                  <Checkbox
                    checked={withFees === false}
                    onCheckedChange={() => setWithFees(false)}
                    className="data-[state=checked]:border-[#234D65] data-[state=checked]:bg-[#234D65]"
                  />
                  <span className="text-sm">Sans frais</span>
                </label>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="penalty-agent" className="mb-2 block">
              Agent de recouvrement
            </Label>
            <AgentRecouvrementSelect
              value={agentRecouvrementId}
              onValueChange={setAgentRecouvrementId}
              placeholder="Sélectionner un agent"
            />
          </div>

          <div>
            <Label htmlFor="penalty-proof" className="flex items-center gap-2 mb-2">
              <Upload className="h-4 w-4" />
              Preuve de paiement
            </Label>
            <Input
              id="penalty-proof"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            {isCompressing && (
              <p className="mt-1 text-sm text-gray-500">Compression de l&apos;image...</p>
            )}
            {proofFile && !isCompressing && (
              <p className="mt-1 text-sm text-gray-600">
                Fichier : {proofFile.name} ({ImageCompressionService.formatFileSize(proofFile.size)})
              </p>
            )}
            {!proofFile && isEditMode && penalty?.proofUrl && (
              <a
                href={penalty.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-sm text-[#234D65] underline"
              >
                Voir la preuve actuelle
              </a>
            )}
          </div>

          <div>
            <Label htmlFor="penalty-comment">Commentaire</Label>
            <Textarea
              id="penalty-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Commentaire sur le paiement de la pénalité"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={activeMutation.isPending || isCompressing}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-[#234D65] text-white hover:bg-[#1b3c4f]"
              disabled={activeMutation.isPending || isCompressing || !penalty}
            >
              {activeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? 'Modification...' : 'Paiement...'}
                </>
              ) : (
                isEditMode ? 'Modifier la pénalité' : 'Payer la pénalité'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
