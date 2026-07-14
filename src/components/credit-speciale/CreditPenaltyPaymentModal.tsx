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
import { usePayCreditPenalty, useUpdateCreditPenaltyPayment } from '@/hooks/useCreditSpeciale'
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
  ExternalLink,
  FileText,
  Loader2,
  Smartphone,
  Upload,
} from 'lucide-react'
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
      <ModalContent size="lg">
        <ModalHeader
          icon={DollarSign}
          title={isEditMode ? 'Modifier le paiement de la pénalité' : 'Payer une pénalité'}
          description={
            isEditMode
              ? 'Mettez à jour les informations d’encaissement de cette pénalité payée.'
              : 'Enregistrez le paiement de cette pénalité avec sa preuve et ses informations d’encaissement.'
          }
        />

        <ModalBody>
        <form id="credit-penalty-payment-form" onSubmit={handleSubmit} className="space-y-6 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="penalty-payment-date" className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date de paiement *
              </Label>
              <Input
                id="penalty-payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="penalty-payment-time" className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Heure de paiement *
              </Label>
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
            <Label htmlFor="penalty-amount" className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Montant de la pénalité
            </Label>
            <Input
              id="penalty-amount"
              type="text"
              value={penalty ? `${penalty.amount.toLocaleString('fr-FR')} FCFA` : ''}
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Montant fixe de la pénalité, non modifiable.
            </p>
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              Moyen de paiement *
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                <input
                  type="radio"
                  name="penaltyPaymentMode"
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
                  name="penaltyPaymentMode"
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
                  name="penaltyPaymentMode"
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
                  name="penaltyPaymentMode"
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
              <Upload className="h-4 w-4 text-muted-foreground" />
              {isEditMode ? 'Nouvelle preuve (optionnel)' : 'Preuve de paiement'}
            </Label>
            {isEditMode && penalty?.proofUrl && (
              <div className="mb-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Preuve actuelle
                </p>
                <a
                  href={penalty.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#224D62] hover:underline flex items-center gap-1"
                >
                  Voir la preuve actuelle
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            <Input
              id="penalty-proof"
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
            <Label htmlFor="penalty-comment" className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Commentaire
            </Label>
            <Textarea
              id="penalty-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Commentaire sur le paiement de la pénalité"
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
            form="credit-penalty-payment-form"
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
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
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
