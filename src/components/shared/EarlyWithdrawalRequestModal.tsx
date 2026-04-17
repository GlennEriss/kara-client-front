'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  defaultEarlyRefundCIValues,
  earlyRefundCISchema,
  WITHDRAWAL_MODES,
  type EarlyRefundCIFormData,
} from '@/schemas/caisse-imprevue/early-refund-ci.schema'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangle,
  Banknote,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  InfoIcon,
  Loader2,
  Smartphone,
  TrendingUp,
  Upload,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

export type EarlyWithdrawalRequestPayload = EarlyRefundCIFormData

interface EarlyWithdrawalRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: EarlyWithdrawalRequestPayload) => Promise<void>
  isSubmitting: boolean
  memberDisplayName: string
  contractDisplayLabel: string
  monthlyAmountLabel?: string
  maxAmount: number
  maxAmountLabel?: string
  title?: string
  description?: string
  submitLabel?: string
}

export default function EarlyWithdrawalRequestModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  memberDisplayName,
  contractDisplayLabel,
  monthlyAmountLabel,
  maxAmount,
  maxAmountLabel = 'Montant total versé',
  title = 'Demande de retrait anticipé',
  description = 'Remplissez tous les champs ci-dessous pour effectuer votre demande de retrait anticipé',
  submitLabel = 'Soumettre la demande',
}: EarlyWithdrawalRequestModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<EarlyRefundCIFormData>({
    resolver: zodResolver(earlyRefundCISchema),
    defaultValues: defaultEarlyRefundCIValues,
  })

  const [withdrawalProofFile, setWithdrawalProofFile] = useState<File | null>(null)
  const [documentPdfFile, setDocumentPdfFile] = useState<File | null>(null)

  useEffect(() => {
    if (isOpen) {
      const defaultValues = {
        ...defaultEarlyRefundCIValues,
        withdrawalAmount: maxAmount > 0 ? Math.round(maxAmount) : 0,
      }
      reset(defaultValues)
      setValue('withdrawalAmount', maxAmount > 0 ? Math.round(maxAmount) : 0)
      setWithdrawalProofFile(null)
      setDocumentPdfFile(null)
    }
  }, [isOpen, maxAmount, reset, setValue])

  const handleWithdrawalProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!validTypes.includes(file.type)) {
        toast.error('Le fichier doit être une image (JPEG, PNG, WebP)')
        e.target.value = ''
        return
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error('La taille du fichier ne doit pas dépasser 20 MB')
        e.target.value = ''
        return
      }
      setWithdrawalProofFile(file)
      setValue('withdrawalProof', file, { shouldValidate: true })
      return
    }
    setWithdrawalProofFile(null)
    setValue('withdrawalProof', undefined as any, { shouldValidate: true })
  }

  const handleDocumentPdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Le fichier doit être un PDF')
        e.target.value = ''
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('La taille du PDF ne doit pas dépasser 10 MB')
        e.target.value = ''
        return
      }
      setDocumentPdfFile(file)
      setValue('documentPdf', file, { shouldValidate: true })
      return
    }
    setDocumentPdfFile(null)
    setValue('documentPdf', undefined as any, { shouldValidate: true })
  }

  const withdrawalAmount = watch('withdrawalAmount')
  const isAmountValid = withdrawalAmount && withdrawalAmount > 0 && withdrawalAmount <= maxAmount

  const handleFormSubmit = async (data: EarlyRefundCIFormData) => {
    if (!withdrawalProofFile) {
      toast.error('Veuillez téléverser la preuve du retrait')
      return
    }
    if (!documentPdfFile) {
      toast.error('Veuillez téléverser le document PDF signé')
      return
    }
    if (data.withdrawalAmount > maxAmount) {
      toast.error(`Le montant ne peut pas dépasser ${maxAmount.toLocaleString('fr-FR')} FCFA`)
      return
    }

    await onSubmit({
      ...data,
      withdrawalProof: withdrawalProofFile,
      documentPdf: documentPdfFile,
    })

    reset(defaultEarlyRefundCIValues)
    setWithdrawalProofFile(null)
    setDocumentPdfFile(null)
    onClose()
  }

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'cash':
        return <DollarSign className="h-4 w-4" />
      case 'bank_transfer':
        return <Building2 className="h-4 w-4" />
      case 'airtel_money':
        return <Smartphone className="h-4 w-4" />
      case 'mobicash':
        return <Banknote className="h-4 w-4" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <InfoIcon className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-2 text-sm flex-1">
                <p className="font-semibold text-blue-900">{memberDisplayName}</p>
                <p className="text-blue-700">{contractDisplayLabel}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-blue-700">
                  {monthlyAmountLabel ? <p>{monthlyAmountLabel}</p> : null}
                  <p>
                    {maxAmountLabel} : {maxAmount.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Informations du retrait
            </h3>

            <div>
              <Label htmlFor="reason" className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Motif du retrait * (10-500 caractères)
              </Label>
              <Textarea
                id="reason"
                placeholder="Expliquez la raison du retrait anticipé..."
                rows={4}
                {...register('reason')}
                disabled={isSubmitting}
                className={errors.reason ? 'border-red-500' : ''}
              />
              {errors.reason ? <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p> : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="withdrawalDate" className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Date de retrait *
                </Label>
                <Input
                  id="withdrawalDate"
                  type="date"
                  {...register('withdrawalDate')}
                  disabled={isSubmitting}
                  className={errors.withdrawalDate ? 'border-red-500' : ''}
                  max={new Date().toISOString().split('T')[0]}
                />
                {errors.withdrawalDate ? <p className="text-xs text-red-500 mt-1">{errors.withdrawalDate.message}</p> : null}
              </div>

              <div>
                <Label htmlFor="withdrawalTime" className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Heure de retrait * (HH:mm)
                </Label>
                <Input
                  id="withdrawalTime"
                  type="time"
                  {...register('withdrawalTime')}
                  disabled={isSubmitting}
                  className={errors.withdrawalTime ? 'border-red-500' : ''}
                />
                {errors.withdrawalTime ? <p className="text-xs text-red-500 mt-1">{errors.withdrawalTime.message}</p> : null}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="withdrawalAmount" className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Montant retiré (FCFA) *
                </Label>
                <Input
                  id="withdrawalAmount"
                  type="number"
                  placeholder="Montant en FCFA"
                  {...register('withdrawalAmount', { valueAsNumber: true })}
                  disabled={isSubmitting}
                  className={errors.withdrawalAmount ? 'border-red-500' : ''}
                  min={0}
                  max={maxAmount}
                />
                {errors.withdrawalAmount ? <p className="text-xs text-red-500 mt-1">{errors.withdrawalAmount.message}</p> : null}
                {!errors.withdrawalAmount && withdrawalAmount && withdrawalAmount > maxAmount ? (
                  <p className="text-xs text-red-500 mt-1">
                    Le montant ne peut pas dépasser {maxAmount.toLocaleString('fr-FR')} FCFA
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum disponible : {maxAmount.toLocaleString('fr-FR')} FCFA
                </p>
              </div>

              <div>
                <Label htmlFor="withdrawalMode" className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  Mode de retrait *
                </Label>
                <Select
                  value={watch('withdrawalMode')}
                  onValueChange={(value) => setValue('withdrawalMode', value as any, { shouldValidate: true })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className={errors.withdrawalMode ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Sélectionner un mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {WITHDRAWAL_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        <div className="flex items-center gap-2">
                          {getModeIcon(mode.value)}
                          {mode.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.withdrawalMode ? <p className="text-xs text-red-500 mt-1">{errors.withdrawalMode.message}</p> : null}
              </div>
            </div>
          </div>

          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Pièces justificatives
            </h3>

            <div>
              <Label htmlFor="withdrawalProof" className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Preuve du retrait * (Image uniquement, max 20MB)
              </Label>
              <div className="space-y-2">
                <Input
                  id="withdrawalProof"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleWithdrawalProofChange}
                  disabled={isSubmitting}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {withdrawalProofFile ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Fichier sélectionné :</span>
                    <span className="text-xs">{withdrawalProofFile.name}</span>
                    <span className="text-xs text-gray-500">({(withdrawalProofFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                ) : null}
                {errors.withdrawalProof ? <p className="text-xs text-red-500 mt-1">{errors.withdrawalProof.message}</p> : null}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Téléversez une photo de la preuve du retrait (JPEG, PNG, WebP, max 20MB)
              </p>
            </div>

            <div>
              <Label htmlFor="documentPdf" className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Document PDF signé * (max 10MB)
              </Label>
              <div className="space-y-2">
                <Input
                  id="documentPdf"
                  type="file"
                  accept="application/pdf"
                  onChange={handleDocumentPdfChange}
                  disabled={isSubmitting}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
                {documentPdfFile ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">PDF sélectionné :</span>
                    <span className="text-xs">{documentPdfFile.name}</span>
                    <span className="text-xs text-gray-500">({(documentPdfFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                ) : null}
                {errors.documentPdf ? <p className="text-xs text-red-500 mt-1">{errors.documentPdf.message}</p> : null}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Téléversez le document PDF signé par le membre et l'administration (format PDF uniquement, max 10MB)
              </p>
            </div>
          </div>

          {maxAmount > 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Récapitulatif</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{maxAmountLabel} :</span>
                  <span className="font-semibold text-gray-900">{maxAmount.toLocaleString('fr-FR')} FCFA</span>
                </div>
                {withdrawalAmount && withdrawalAmount > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant retiré :</span>
                    <span className="font-semibold text-blue-600">{withdrawalAmount.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                ) : null}
                {withdrawalAmount && withdrawalAmount > 0 && maxAmount > 0 ? (
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="text-gray-600">Solde restant :</span>
                    <span className="font-semibold text-green-600">{(maxAmount - withdrawalAmount).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700">
              <strong>Important :</strong> Le retrait anticipé sera traité dans un délai de 45 jours.
              Assurez-vous que tous les documents sont correctement remplis et signés.
            </AlertDescription>
          </Alert>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit(handleFormSubmit)}
            disabled={
              isSubmitting ||
              !watch('reason') ||
              !watch('withdrawalDate') ||
              !watch('withdrawalTime') ||
              !watch('withdrawalAmount') ||
              !watch('withdrawalMode') ||
              !withdrawalProofFile ||
              !documentPdfFile ||
              !isAmountValid
            }
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {submitLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
