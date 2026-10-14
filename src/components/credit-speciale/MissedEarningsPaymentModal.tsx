'use client'

import { AgentRecouvrementSelect } from '@/components/agent-recouvrement/AgentRecouvrementSelect'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCreditContractMutations, usePayCreditPenalty } from '@/hooks/useCreditSpeciale'
import { ImageCompressionService } from '@/services/imageCompressionService'
import type { CreditPaymentMode, CreditPenalty } from '@/types/types'
import { format } from 'date-fns'
import {
  Banknote,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  Smartphone,
  Upload,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface MissedEarningsPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  contractId: string
  /** Manque à gagner restant : on ne peut pas encaisser plus. */
  maxAmount: number
  /** Pénalités impayées réglables par ce versement (contrat soldé ou clos). */
  unpaidPenalties?: CreditPenalty[]
}

type PaymentTarget = 'missedEarnings' | 'penalty'

const formatShortDate = (value: Date | string) => format(new Date(value), 'dd/MM/yyyy')

/**
 * Versement sur un contrat terminé : on choisit s'il rembourse le manque à
 * gagner (montant libre, dans la limite du restant) ou une pénalité impayée
 * (réglée en entier). Même saisie qu'un versement (date, heure, moyen, frais,
 * agent, preuve). Le contrat reste terminé.
 */
export default function MissedEarningsPaymentModal({
  isOpen,
  onClose,
  contractId,
  maxAmount,
  unpaidPenalties = [],
}: MissedEarningsPaymentModalProps) {
  const { recordMissedEarningsPayment } = useCreditContractMutations()
  const payPenalty = usePayCreditPenalty()
  const canPayMissedEarnings = maxAmount > 0
  const canPayPenalty = unpaidPenalties.length > 0
  const [target, setTarget] = useState<PaymentTarget>('missedEarnings')
  const [penaltyId, setPenaltyId] = useState('')
  const selectedPenalty = unpaidPenalties.find((penalty) => penalty.id === penaltyId)
  const isPenalty = target === 'penalty'
  const activeMutation = isPenalty ? payPenalty : recordMissedEarningsPayment
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [paymentTime, setPaymentTime] = useState(format(new Date(), 'HH:mm'))
  const [mode, setMode] = useState<CreditPaymentMode>('airtel_money')
  const [withFees, setWithFees] = useState<boolean | undefined>(undefined)
  const [agentRecouvrementId, setAgentRecouvrementId] = useState('')
  const [comment, setComment] = useState('')
  const [proofFile, setProofFile] = useState<File | undefined>()
  const [isCompressing, setIsCompressing] = useState(false)
  const value = isPenalty ? Math.round(selectedPenalty?.amount ?? 0) : Math.round(Number(amount) || 0)
  const isAmountValid = isPenalty ? !!selectedPenalty : value > 0 && value <= maxAmount

  useEffect(() => {
    if (!isOpen) return
    setTarget(canPayMissedEarnings ? 'missedEarnings' : 'penalty')
    setPenaltyId('')
    setAmount('')
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'))
    setPaymentTime(format(new Date(), 'HH:mm'))
    setMode('airtel_money')
    setWithFees(undefined)
    setAgentRecouvrementId('')
    setComment('')
    setProofFile(undefined)
    setIsCompressing(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- réinitialisation à l'ouverture seulement
  }, [isOpen])

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
    if (!isAmountValid) {
      toast.error(
        isPenalty
          ? 'Choisissez la pénalité à régler'
          : `Le montant doit être compris entre 1 et ${maxAmount.toLocaleString('fr-FR')} FCFA`
      )
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
      const common = {
        paymentTime,
        amount: value,
        mode,
        withFees: mode === 'airtel_money' || mode === 'mobicash' ? withFees : undefined,
        agentRecouvrementId: agentRecouvrementId || undefined,
        comment: comment.trim() || undefined,
        proofFile,
      }
      if (isPenalty && selectedPenalty) {
        await payPenalty.mutateAsync({ ...common, penaltyId: selectedPenalty.id, creditId: contractId, paymentDate: paidAt })
      } else {
        await recordMissedEarningsPayment.mutateAsync({ ...common, contractId, date: paidAt })
      }
      handleClose()
    } catch {
      // toast géré dans le hook
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <ModalContent size="lg">
        <ModalHeader
          icon={DollarSign}
          title="Versement après clôture"
          description="Le contrat est terminé : ce versement rembourse soit le manque à gagner, soit une pénalité impayée."
        />

        <ModalBody>
        <form id="missed-earnings-payment-form" onSubmit={handleSubmit} className="space-y-6 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="missed-earnings-date" className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date de paiement *
              </Label>
              <Input
                id="missed-earnings-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="missed-earnings-time" className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Heure de paiement *
              </Label>
              <Input
                id="missed-earnings-time"
                type="time"
                value={paymentTime}
                onChange={(e) => setPaymentTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Ce versement rembourse *</Label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className={`flex items-center gap-3 rounded-xl border-2 p-4 ${canPayMissedEarnings ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed opacity-50'} has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5`}>
                <input
                  type="radio"
                  name="afterClosureTarget"
                  checked={target === 'missedEarnings'}
                  disabled={!canPayMissedEarnings}
                  onChange={() => setTarget('missedEarnings')}
                />
                <span>
                  <span className="block font-medium text-gray-900">Le manque à gagner</span>
                  <span className="block text-xs text-gray-500">Restant : {maxAmount.toLocaleString('fr-FR')} FCFA</span>
                </span>
              </label>
              <label className={`flex items-center gap-3 rounded-xl border-2 p-4 ${canPayPenalty ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed opacity-50'} has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5`}>
                <input
                  type="radio"
                  name="afterClosureTarget"
                  checked={target === 'penalty'}
                  disabled={!canPayPenalty}
                  onChange={() => setTarget('penalty')}
                />
                <span>
                  <span className="block font-medium text-gray-900">Une pénalité impayée</span>
                  <span className="block text-xs text-gray-500">
                    {unpaidPenalties.length} pénalité{unpaidPenalties.length > 1 ? 's' : ''} impayée{unpaidPenalties.length > 1 ? 's' : ''}
                  </span>
                </span>
              </label>
            </div>
          </div>

          {isPenalty ? (
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Pénalité à régler *
              </Label>
              <Select value={penaltyId} onValueChange={setPenaltyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir la pénalité" />
                </SelectTrigger>
                <SelectContent>
                  {unpaidPenalties.map((penalty) => (
                    <SelectItem key={penalty.id} value={penalty.id}>
                      Échéance du {formatShortDate(penalty.dueDate)} · {penalty.daysLate} j de retard · {penalty.amount.toLocaleString('fr-FR')} FCFA
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Une pénalité se règle en entier : montant fixe
                {selectedPenalty ? ` de ${selectedPenalty.amount.toLocaleString('fr-FR')} FCFA` : ''}.
              </p>
            </div>
          ) : (
            <div>
              <Label htmlFor="missed-earnings-amount" className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Montant versé (FCFA) *
              </Label>
              <Input
                id="missed-earnings-amount"
                type="number"
                min={1}
                max={maxAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <p className={`text-xs mt-1 ${value > maxAmount ? 'text-red-600' : 'text-muted-foreground'}`}>
                {value > maxAmount
                  ? 'Le montant dépasse le manque à gagner restant.'
                  : `Au plus ${maxAmount.toLocaleString('fr-FR')} FCFA (manque à gagner restant).`}
              </p>
            </div>
          )}

          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              Moyen de paiement *
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                <input
                  type="radio"
                  name="missedEarningsMode"
                  value="airtel_money"
                  checked={mode === 'airtel_money'}
                  onChange={(e) => setMode(e.target.value as CreditPaymentMode)}
                  className="text-[#224D62] focus:ring-[#224D62]"
                />
                <div className="ml-3 flex items-center gap-3">
                  <div className="bg-red-100 rounded-lg p-2">
                    <Smartphone className="h-5 w-5 text-red-600" />
                  </div>
                  <span className="font-medium text-gray-900">Airtel Money</span>
                </div>
              </label>

              <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                <input
                  type="radio"
                  name="missedEarningsMode"
                  value="mobicash"
                  checked={mode === 'mobicash'}
                  onChange={(e) => setMode(e.target.value as CreditPaymentMode)}
                  className="text-[#224D62] focus:ring-[#224D62]"
                />
                <div className="ml-3 flex items-center gap-3">
                  <div className="bg-blue-100 rounded-lg p-2">
                    <Banknote className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-900">Mobicash</span>
                </div>
              </label>

              <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                <input
                  type="radio"
                  name="missedEarningsMode"
                  value="cash"
                  checked={mode === 'cash'}
                  onChange={(e) => {
                    setMode(e.target.value as CreditPaymentMode)
                    setWithFees(undefined)
                  }}
                  className="text-[#224D62] focus:ring-[#224D62]"
                />
                <div className="ml-3 flex items-center gap-3">
                  <div className="bg-green-100 rounded-lg p-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="font-medium text-gray-900">Espèce</span>
                </div>
              </label>

              <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                <input
                  type="radio"
                  name="missedEarningsMode"
                  value="bank_transfer"
                  checked={mode === 'bank_transfer'}
                  onChange={(e) => {
                    setMode(e.target.value as CreditPaymentMode)
                    setWithFees(undefined)
                  }}
                  className="text-[#224D62] focus:ring-[#224D62]"
                />
                <div className="ml-3 flex items-center gap-3">
                  <div className="bg-purple-100 rounded-lg p-2">
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="font-medium text-gray-900">Virement bancaire</span>
                </div>
              </label>
            </div>
          </div>

          {(mode === 'airtel_money' || mode === 'mobicash') && (
            <div className="mt-1">
              <Label className="text-sm font-medium">Frais de transaction *</Label>
              <Select
                value={withFees === undefined ? '' : withFees ? 'yes' : 'no'}
                onValueChange={(value) => setWithFees(value === 'yes')}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Avec ou sans frais ?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Avec frais</SelectItem>
                  <SelectItem value="no">Sans frais</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="missed-earnings-agent" className="mb-2 block">
              Agent de recouvrement
            </Label>
            <AgentRecouvrementSelect
              value={agentRecouvrementId}
              onValueChange={setAgentRecouvrementId}
              placeholder="Sélectionner un agent"
            />
          </div>

          <div>
            <Label htmlFor="missed-earnings-proof" className="flex items-center gap-2 mb-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              Preuve de paiement
            </Label>
            <Input
              id="missed-earnings-proof"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isCompressing || activeMutation.isPending}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Formats acceptés : JPEG, PNG, WebP (max 10 MB).
            </p>
            {isCompressing && (
              <Alert className="mt-2 border-blue-200 bg-blue-50">
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                <AlertDescription className="text-blue-700">
                  Compression de l&apos;image...
                </AlertDescription>
              </Alert>
            )}
            {proofFile && !isCompressing && (
              <Alert className="mt-2 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  <strong>{proofFile.name}</strong> ({ImageCompressionService.formatFileSize(proofFile.size)})
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div>
            <Label htmlFor="missed-earnings-comment" className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Commentaire
            </Label>
            <Textarea
              id="missed-earnings-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Commentaire sur ce versement"
            />
          </div>

        </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={activeMutation.isPending || isCompressing}>
            Annuler
          </Button>
          <Button
            type="submit"
            form="missed-earnings-payment-form"
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
            disabled={activeMutation.isPending || isCompressing || !isAmountValid}
          >
            {activeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer le versement'
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
