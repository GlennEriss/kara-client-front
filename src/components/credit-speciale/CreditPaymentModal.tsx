'use client'

import { AgentRecouvrementSelect } from '@/components/agent-recouvrement/AgentRecouvrementSelect'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useAuth } from '@/hooks/useAuth'
import {
  useCreditContract,
  useCreditPaymentMutations,
  useCreditPaymentsByCreditId,
  useCreditPenaltiesByCreditId,
} from '@/hooks/useCreditSpeciale'
import { creditPaymentFormSchema, type CreditPaymentFormInput } from '@/schemas/credit-speciale.schema'
import { ImageCompressionService } from '@/services/imageCompressionService'
import { CreditPayment, CreditPaymentMode } from '@/types/types'
import {
  buildCreditSpecialeHistory,
  getContractCalendarMonthFromDate,
} from '@/utils/credit-speciale-history'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
    AlertCircle,
    AlertTriangle,
    Calendar,
    Clock,
    DollarSign,
    Loader2,
    Upload
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface CreditPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  creditId: string
  defaultAmount?: number
  defaultPaymentDate?: Date // Date de l'échéance pour calculer le retard
  onSuccess?: () => void
  installmentId?: string // ID de l'échéance spécifique à payer
  installmentNumber?: number // Numéro du mois de l'échéance (M1, M2, etc.)
  /** Paiement à modifier (mode édition) */
  paymentToEdit?: CreditPayment | null
  /** Libellé du bouton de soumission en mode édition */
  submitLabel?: string
}

// Fonction pour calculer la note automatique selon le retard (jours de retard)
const calculateNoteByDelay = (daysLate: number): number => {
  if (daysLate <= 0) {
    return 10 // Paiement à temps
  } else if (daysLate <= 7) {
    return 8 // Retard de moins d'une semaine
  } else if (daysLate <= 15) {
    return 6 // Retard de 1-2 semaines
  } else if (daysLate <= 30) {
    return 4 // Retard de 2-4 semaines
  } else if (daysLate <= 60) {
    return 2 // Retard de 1-2 mois
  } else {
    return 1 // Retard de plus de 2 mois
  }
}

// Commentaire : CONFORME si payé, NON CONFORME si non payé
const getDefaultComment = (isPaid: boolean): string =>
  isPaid ? 'CONFORME' : 'NON CONFORME'

export default function CreditPaymentModal({
  isOpen,
  onClose,
  creditId,
  defaultAmount,
  defaultPaymentDate,
  onSuccess,
  installmentId,
  installmentNumber,
  paymentToEdit,
  submitLabel,
}: CreditPaymentModalProps) {
  const editMode = !!paymentToEdit
  const [proofFile, setProofFile] = useState<File | undefined>()
  const [isCompressing, setIsCompressing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [agentRecouvrementId, setAgentRecouvrementId] = useState<string>('')
  const [withFees, setWithFees] = useState<boolean | undefined>(undefined) // Airtel Money / Mobicash : true = avec frais, false = sans frais
  const [modificationReason, setModificationReason] = useState<string>('')

  const { user } = useAuth()
  const { create: createPayment, update: updatePayment } = useCreditPaymentMutations()
  const { data: contract } = useCreditContract(creditId)
  const { data: payments = [] } = useCreditPaymentsByCreditId(creditId)
  const { data: penalties = [] } = useCreditPenaltiesByCreditId(creditId)
  const queryClient = useQueryClient()

  const autoComment = useMemo(() => getDefaultComment(true), [])

  const form = useForm<CreditPaymentFormInput>({
    resolver: zodResolver(creditPaymentFormSchema),
    defaultValues: {
      creditId,
      amount: defaultAmount || 0,
      paymentDate: defaultPaymentDate || new Date(),
      paymentTime: format(new Date(), 'HH:mm'),
      mode: 'airtel_money',
      comment: autoComment,
      note: 10,
    },
    mode: 'onChange',
  })

  const watchedPaymentDate = form.watch('paymentDate')
  const watchedAmount = form.watch('amount') || 0

  // Calculer le retard réel à partir de la date de versement choisie dans le formulaire.
  const calculatedDaysLate = useMemo(() => {
    if (!defaultPaymentDate || !watchedPaymentDate) return 0
    const payDate = new Date(watchedPaymentDate)
    payDate.setHours(0, 0, 0, 0)
    const dueDate = new Date(defaultPaymentDate)
    dueDate.setHours(0, 0, 0, 0)
    const diffTime = payDate.getTime() - dueDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }, [defaultPaymentDate, watchedPaymentDate])

  // Calculer la note selon le retard ; commentaire par défaut = CONFORME (on enregistre un paiement)
  const autoNote = useMemo(() => calculateNoteByDelay(calculatedDaysLate), [calculatedDaysLate])

  const isLateButNoPenalty = useMemo(
    () => calculatedDaysLate > 0 && calculatedDaysLate <= 3,
    [calculatedDaysLate]
  )
  
  // Log des erreurs du formulaire pour déboguer
  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      console.log('Erreurs de validation du formulaire:', form.formState.errors)
    }
  }, [form.formState.errors])

  React.useEffect(() => {
    if (defaultAmount) {
      form.setValue('amount', defaultAmount)
    }
  }, [defaultAmount, form])

  // Normaliser paymentDate (Date ou Firestore Timestamp)
  const toDate = (v: CreditPayment['paymentDate']): Date => {
    if (!v) return new Date()
    if (v instanceof Date) return v
    const t = v as { toDate?: () => Date }
    return typeof t.toDate === 'function' ? t.toDate() : new Date(v as string | number)
  }

  // Normaliser le mode de paiement (valeurs legacy ou API ex. "banque" -> "bank_transfer")
  const toCreditPaymentMode = (mode: string | undefined): CreditPaymentMode => {
    const m = (mode ?? '').toLowerCase()
    if (m === 'bank_transfer' || m === 'banque' || m === 'banktransfer' || m === 'virement') return 'bank_transfer'
    if (m === 'airtel_money' || m === 'airtelmoney') return 'airtel_money'
    if (m === 'mobicash') return 'mobicash'
    if (m === 'cash' || m === 'espèce' || m === 'espece') return 'cash'
    return 'airtel_money'
  }

  // Nettoyer les pénalités rétroactives et réinitialiser les pénalités sélectionnées quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setModificationReason('')
      if (paymentToEdit) {
        const date = toDate(paymentToEdit.paymentDate)
        form.setValue('paymentDate', date)
        form.setValue('paymentTime', paymentToEdit.paymentTime || format(new Date(), 'HH:mm'))
        form.setValue('amount', paymentToEdit.amount ?? 0)
        form.setValue('mode', toCreditPaymentMode(paymentToEdit.mode as string))
        form.setValue('comment', paymentToEdit.comment ?? '')
        form.setValue('note', paymentToEdit.note ?? 10)
        setAgentRecouvrementId(paymentToEdit.agentRecouvrementId ?? '')
        setWithFees(
          paymentToEdit.mode === 'airtel_money' || paymentToEdit.mode === 'mobicash'
            ? paymentToEdit.withFees
            : undefined
        )
        return
      }
      // Nettoyer les pénalités rétroactives avant d'afficher la liste (création uniquement)
      const service = ServiceFactory.getCreditSpecialeService()
      service.checkAndCreateMissingPenalties(creditId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['creditPenalties', creditId] })
        })
        .catch((error: unknown) => {
          console.error('Erreur lors du nettoyage des pénalités rétroactives:', error)
        })
      setAgentRecouvrementId('')
      setWithFees(undefined)
      if (defaultPaymentDate) {
        form.setValue('paymentDate', defaultPaymentDate)
      } else {
        form.setValue('paymentDate', new Date())
      }
      form.setValue('note', autoNote)
      form.setValue('comment', autoComment)
    }
  }, [isOpen, form, defaultPaymentDate, autoComment, paymentToEdit, creditId, queryClient])

  // En création, la note automatique peut suivre la date choisie sans réinitialiser
  // les autres champs du formulaire.
  useEffect(() => {
    if (!isOpen || !!paymentToEdit) return
    if (form.formState.dirtyFields.note) return
    form.setValue('note', autoNote)
  }, [isOpen, paymentToEdit, autoNote, form])

  const currentPaymentMonth = useMemo(() => {
    if (!contract) return undefined
    if (installmentNumber && installmentNumber > 0) return installmentNumber
    if (defaultPaymentDate) {
      return getContractCalendarMonthFromDate(contract, new Date(defaultPaymentDate))
    }
    return undefined
  }, [contract, installmentNumber, defaultPaymentDate])

  const recordedPayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          payment.amount > 0 ||
          payment.comment?.includes('Paiement de 0 FCFA') ||
          payment.comment?.includes('Paiement de pénalités uniquement')
      ),
    [payments]
  )

  const currentMonthHistory = useMemo(() => {
    if (!contract || contract.creditType !== 'SPECIALE' || !currentPaymentMonth) return null
    const history = buildCreditSpecialeHistory(contract, recordedPayments, {
      endMonth: currentPaymentMonth,
      projectUntilZero: false,
    })
    return history.find((row) => row.month === currentPaymentMonth) ?? null
  }, [contract, currentPaymentMonth, recordedPayments])

  const linkedPenalties = useMemo(() => {
    if (editMode || !defaultPaymentDate) return []
    const currentDueDate = new Date(defaultPaymentDate)
    currentDueDate.setHours(0, 0, 0, 0)

    return penalties.filter((penalty) => {
      if (penalty.paid) return false
      const penaltyDueDate = new Date(penalty.dueDate)
      penaltyDueDate.setHours(0, 0, 0, 0)
      return penaltyDueDate.getTime() === currentDueDate.getTime()
    })
  }, [defaultPaymentDate, editMode, penalties])

  const currentVersementPenaltyBase = currentMonthHistory?.interest ?? 0

  // Calculer la pénalité potentielle du versement courant selon la règle officielle :
  // intérêt du mois * nombre de jours de retard / 30.
  const potentialPenalty = useMemo(() => {
    if (editMode || watchedAmount <= 0) return null
    if (linkedPenalties.length > 0) return null
    if (calculatedDaysLate > 3 && currentVersementPenaltyBase > 0) {
      const penaltyAmount = (currentVersementPenaltyBase * calculatedDaysLate) / 30
      return {
        daysLate: calculatedDaysLate,
        amount: Math.round(penaltyAmount),
        interestBase: Math.round(currentVersementPenaltyBase),
      }
    }

    return null
  }, [editMode, watchedAmount, linkedPenalties.length, calculatedDaysLate, currentVersementPenaltyBase])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setProofFile(undefined)
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Le fichier doit être une image')
      e.target.value = ''
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('La taille du fichier ne doit pas dépasser 10 MB')
      e.target.value = ''
      return
    }

    try {
      setIsCompressing(true)
      const compressedFile = await ImageCompressionService.compressImage(file, 1, 1920)
      setProofFile(compressedFile)
      
      const originalSize = ImageCompressionService.formatFileSize(file.size)
      const compressedSize = ImageCompressionService.formatFileSize(compressedFile.size)
      const reduction = (((file.size - compressedFile.size) / file.size) * 100).toFixed(1)
      
      toast.success(`Image compressée avec succès`, {
        description: `${originalSize} → ${compressedSize} (${reduction}% de réduction)`
      })
    } catch (error) {
      console.error('Erreur lors de la compression:', error)
      toast.error('Erreur lors de la compression de l\'image')
      e.target.value = ''
    } finally {
      setIsCompressing(false)
    }
  }

  const onSubmit = async (data: CreditPaymentFormInput) => {
    if (!user?.uid) {
      toast.error('Vous devez être connecté pour enregistrer un paiement')
      return
    }

    if (editMode) {
      const reason = (modificationReason ?? '').trim()
      if (!reason) {
        toast.error('Veuillez indiquer le motif de la modification')
        return
      }
      try {
        setIsSubmitting(true)
        const paymentDate = data.paymentDate instanceof Date ? data.paymentDate : new Date(data.paymentDate)
        const editMode = form.watch('mode') as CreditPaymentMode
        await updatePayment.mutateAsync({
          paymentId: paymentToEdit!.id,
          creditId,
          data: {
            paymentDate,
            paymentTime: data.paymentTime,
            amount: data.amount,
            mode: data.mode,
            comment: data.comment,
            note: data.note,
            withFees: editMode === 'airtel_money' || editMode === 'mobicash' ? withFees : undefined,
            agentRecouvrementId: agentRecouvrementId?.trim() || undefined,
          },
          proofFile,
          modificationReason: reason,
        })
        form.reset()
        setProofFile(undefined)
        setModificationReason('')
        setAgentRecouvrementId('')
        setWithFees(undefined)
        onSuccess?.()
        onClose()
      } catch (error: unknown) {
        console.error('Erreur lors de la modification du paiement:', error)
        toast.error(error instanceof Error ? error.message : 'Erreur lors de la modification du paiement')
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    const currentMode = form.watch('mode') as CreditPaymentMode
    if ((currentMode === 'airtel_money' || currentMode === 'mobicash') && withFees === undefined) {
      toast.error('Veuillez indiquer si le paiement Airtel Money / Mobicash est avec frais ou sans frais')
      return
    }

    if (data.amount < 0) {
      toast.error('Le montant ne peut pas être négatif')
      return
    }

    try {
      setIsSubmitting(true)
      const finalNote = data.note ?? 10
      let finalComment = data.comment
      if (data.amount === 0) {
        finalComment = `Paiement de 0 FCFA${data.comment ? ` - ${data.comment}` : ''}`
      }

      const paymentData = {
        ...data,
        amount: data.amount,
        principalAmount: 0,
        interestAmount: 0,
        penaltyAmount: 0,
        note: finalNote,
        comment: finalComment,
        createdBy: user.uid,
        installmentId,
        agentRecouvrementId: agentRecouvrementId || undefined,
        withFees: currentMode === 'airtel_money' || currentMode === 'mobicash' ? withFees : undefined,
      }

      await createPayment.mutateAsync({
        data: paymentData,
        proofFile,
        installmentNumber,
      })

      form.reset()
      setProofFile(undefined)
      setAgentRecouvrementId('')
      setWithFees(undefined)
      onSuccess?.()
      onClose()
    } catch (error: unknown) {
      console.error('Erreur lors de l\'enregistrement du paiement:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement du paiement')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            {editMode ? 'Modifier le versement' : 'Enregistrer un versement'}
          </DialogTitle>
          <DialogDescription>
            {editMode ? 'Modifiez les informations du versement et indiquez le motif de la modification.' : 'Enregistrez un nouveau versement pour ce crédit'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Date et Heure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment-date" className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date de paiement *
              </Label>
              <Controller
                name="paymentDate"
                control={form.control}
                render={({ field }) => (
                  <Input
                    id="payment-date"
                    type="date"
                    required
                    value={field.value ? format(field.value instanceof Date ? field.value : new Date(field.value), 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      const v = e.target.value
                      field.onChange(v ? new Date(v) : new Date())
                    }}
                  />
                )}
              />
              {form.formState.errors.paymentDate && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.paymentDate.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="payment-time" className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Heure (HH:mm) *
              </Label>
              <Input
                id="payment-time"
                type="time"
                {...form.register('paymentTime')}
                required
              />
              {form.formState.errors.paymentTime && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.paymentTime.message}
                </p>
              )}
            </div>
          </div>

          {/* Montant et Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount" className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Montant du versement (FCFA) *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                {...form.register('amount', { valueAsNumber: true })}
                required
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="mode" className="mb-2">Moyen de paiement *</Label>
              <Select
                value={toCreditPaymentMode(form.watch('mode') as string)}
                onValueChange={(value) => {
                  form.setValue('mode', value as CreditPaymentMode)
                  if (value !== 'airtel_money' && value !== 'mobicash') setWithFees(undefined)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un moyen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="airtel_money">Airtel Money</SelectItem>
                  <SelectItem value="mobicash">Mobicash</SelectItem>
                  <SelectItem value="cash">Espèce</SelectItem>
                  <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.mode && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.mode.message}
                </p>
              )}
            </div>
          </div>

          {/* Avec frais / Sans frais (Airtel Money et Mobicash uniquement) */}
          {(form.watch('mode') === 'airtel_money' || form.watch('mode') === 'mobicash') && (
            <div className="space-y-2">
              <Label>Frais</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="withFees"
                    checked={withFees === true}
                    onChange={() => setWithFees(true)}
                    className="rounded-full border-gray-300"
                  />
                  <span>Avec frais</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="withFees"
                    checked={withFees === false}
                    onChange={() => setWithFees(false)}
                    className="rounded-full border-gray-300"
                  />
                  <span>Sans frais</span>
                </label>
              </div>
            </div>
          )}

          {/* Agent de recouvrement */}
          <div>
            <Label htmlFor="agent-recouvrement" className="flex items-center gap-2 mb-2">
              Agent de recouvrement (optionnel)
            </Label>
            <AgentRecouvrementSelect
              value={agentRecouvrementId}
              onValueChange={setAgentRecouvrementId}
              placeholder="Sélectionner l'agent ayant collecté le paiement"
              required={false}
            />
          </div>

          {/* Preuve de paiement */}
          <div>
            <Label htmlFor="proof" className="flex items-center gap-2 mb-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              {editMode ? 'Nouvelle preuve (optionnel)' : 'Preuve de paiement (recommandé)'}
            </Label>
            {editMode && paymentToEdit?.proofUrl && (
              <p className="text-sm text-gray-600 mb-2">
                Preuve actuelle :{' '}
                <a href={paymentToEdit.proofUrl} target="_blank" rel="noopener noreferrer" className="text-[#234D65] underline">
                  Voir le fichier
                </a>
              </p>
            )}
            <Input
              id="proof"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isCompressing}
            />
            {isCompressing && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Compression de l'image...
              </div>
            )}
            {proofFile && !isCompressing && (
              <Alert className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Fichier sélectionné : {proofFile.name} ({ImageCompressionService.formatFileSize(proofFile.size)})
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Motif de la modification (obligatoire en mode édition) */}
          {editMode && (
            <div>
              <Label htmlFor="modification-reason" className="flex items-center gap-2 mb-2">
                Motif de la modification *
              </Label>
              <Textarea
                id="modification-reason"
                value={modificationReason}
                onChange={(e) => setModificationReason(e.target.value)}
                rows={3}
                placeholder="Indiquez le motif de la modification du versement..."
                required
                className={!modificationReason.trim() && form.formState.isSubmitted ? 'border-red-500' : ''}
              />
            </div>
          )}

          {/* Pénalité déjà liée à cette échéance (information seulement) */}
          {!editMode && linkedPenalties.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-4 w-4" />
                  Pénalité liée à ce versement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-orange-700">
                  Cette pénalité existe déjà pour cette échéance. Elle se règle dans la section dédiée du contrat, pas dans ce formulaire.
                </p>
                {linkedPenalties.map((penalty) => (
                  <div
                    key={penalty.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {penalty.daysLate} jour{penalty.daysLate > 1 ? 's' : ''} de retard
                      </p>
                      <p className="text-xs text-gray-600">
                        Échéance : {format(new Date(penalty.dueDate), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-600">
                        {penalty.amount.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Message informatif pour retards de 1-2 jours (sans pénalité) */}
          {isLateButNoPenalty && !potentialPenalty && (
            <Alert variant="default" className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium text-yellow-800">
                    Paiement en retard de {calculatedDaysLate} jour{calculatedDaysLate > 1 ? 's' : ''}
                  </p>
                  <p className="text-yellow-700">
                    Aucune pénalité ne sera appliquée. Les pénalités commencent uniquement à partir du 4e jour de retard.
                  </p>
                  {defaultPaymentDate && (
                    <p className="text-xs text-yellow-600 mt-1">
                      Échéance concernée : {format(new Date(defaultPaymentDate), 'dd/MM/yyyy')}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Pénalité potentielle */}
          {potentialPenalty && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">
                    Pénalité de ce versement : {potentialPenalty.daysLate} jour{potentialPenalty.daysLate > 1 ? 's' : ''} de retard
                  </p>
                  <p>
                    Une pénalité de <strong>{potentialPenalty.amount.toLocaleString('fr-FR')} FCFA</strong> sera créée automatiquement pour cette échéance après l'enregistrement du paiement.
                  </p>
                  <p className="text-xs text-gray-700">
                    Calcul : intérêt du mois ({potentialPenalty.interestBase.toLocaleString('fr-FR')} FCFA) × {potentialPenalty.daysLate} / 30.
                  </p>
                  {defaultPaymentDate && (
                    <p className="text-xs text-gray-600 mt-1">
                      Échéance concernée : {format(new Date(defaultPaymentDate), 'dd/MM/yyyy')}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Résumé informatif */}
          {(linkedPenalties.length > 0 || potentialPenalty) && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-800">Montant du versement :</span>
                  <span className="text-lg font-bold text-blue-600">
                    {watchedAmount.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                {linkedPenalties.length > 0 && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-medium text-blue-800">Pénalité liée à cette échéance :</span>
                    <span className="text-lg font-bold text-orange-600">
                      {linkedPenalties.reduce((sum, penalty) => sum + penalty.amount, 0).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                )}
                {potentialPenalty && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-medium text-blue-800">Pénalité générée par ce versement :</span>
                    <span className="text-lg font-bold text-red-600">
                      {potentialPenalty.amount.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div>
            <Label htmlFor="note" className="mb-2">Note (sur 10)</Label>
            <Input
              id="note"
              type="number"
              min="0"
              max="10"
              step="0.1"
              {...form.register('note', {
                valueAsNumber: true,
                setValueAs: (value) => {
                  if (value === '' || value === null || value === undefined) {
                    return autoNote
                  }
                  const num = typeof value === 'string' ? parseFloat(value) : value
                  return isNaN(num) ? autoNote : num
                },
                onChange: (e) => {
                  const noteValue = parseFloat(e.target.value) || autoNote
                  const defaultComment = getDefaultComment(noteValue > 0)
                  form.setValue('comment', defaultComment)
                }
              })}
              placeholder={autoNote.toString()}
            />
            <p className="text-xs text-gray-500 mt-1">
              {calculatedDaysLate > 0 ? (
                <>Note automatique : {autoNote}/10 (retard de {calculatedDaysLate} jour{calculatedDaysLate > 1 ? 's' : ''}). Vous pouvez modifier cette note si nécessaire.</>
              ) : (
                <>Note par défaut : {autoNote}/10 (paiement ponctuel). Vous pouvez modifier cette note si nécessaire.</>
              )}
            </p>
            {form.formState.errors.note && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.note.message}
              </p>
            )}
          </div>

          {/* Commentaire */}
          <div>
            <Label htmlFor="comment" className="mb-2">
              Commentaire (CONFORME / NON CONFORME, modifiable)
            </Label>
            <Textarea
              id="comment"
              {...form.register('comment')}
              rows={2}
              placeholder="CONFORME ou NON CONFORME"
            />
            <p className="text-xs text-gray-500 mt-1">
              CONFORME si le paiement est effectué, NON CONFORME sinon. Vous pouvez modifier si besoin.
            </p>
            {form.formState.errors.comment && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.comment.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editMode ? 'Modification...' : 'Enregistrement...'}
                </>
              ) : (
                submitLabel ?? 'Enregistrer le versement'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
