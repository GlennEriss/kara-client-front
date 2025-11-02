'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Loader2,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  InfoIcon,
  FileText,
  Upload,
  Calendar,
  Clock,
  TrendingUp,
  CreditCard,
  Smartphone,
  Banknote,
  Building2,
  Lock,
} from 'lucide-react'
import { ContractCI } from '@/types/types'
import { useRequestFinalRefundCI } from '@/hooks/caisse-imprevue'
import { useAuth } from '@/hooks/useAuth'
import { useContractPaymentStats } from '@/hooks/caisse-imprevue'
import { toast } from 'sonner'
import { finalRefundCISchema, defaultFinalRefundCIValues, WITHDRAWAL_MODES, type FinalRefundCIFormData } from '@/schemas/caisse-imprevue/final-refund-ci.schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

interface FinalRefundCIModalProps {
  isOpen: boolean
  onClose: () => void
  contract: ContractCI
}

export default function FinalRefundCIModal({
  isOpen,
  onClose,
  contract,
}: FinalRefundCIModalProps) {
  const { user } = useAuth()
  const requestFinalRefundCIMutation = useRequestFinalRefundCI()
  const { data: paymentStats } = useContractPaymentStats(contract.id)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<FinalRefundCIFormData>({
    resolver: zodResolver(finalRefundCISchema),
    defaultValues: defaultFinalRefundCIValues,
  })

  // Watchers pour les fichiers (react-hook-form ne gère pas bien les File)
  const [withdrawalProofFile, setWithdrawalProofFile] = useState<File | null>(null)
  const [documentPdfFile, setDocumentPdfFile] = useState<File | null>(null)

  // Calculer le montant total versé (non modifiable)
  const totalAmountPaid = paymentStats?.totalAmountPaid || 0

  // Réinitialiser le formulaire quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      const defaultValues = {
        ...defaultFinalRefundCIValues,
        withdrawalAmount: totalAmountPaid > 0 ? totalAmountPaid : 0,
      }
      reset(defaultValues)
      setValue('withdrawalAmount', totalAmountPaid > 0 ? totalAmountPaid : 0)
      setWithdrawalProofFile(null)
      setDocumentPdfFile(null)
    }
  }, [isOpen, reset, totalAmountPaid, setValue])

  // Gestion du changement de la preuve du retrait
  const handleWithdrawalProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Vérifier le type (image uniquement)
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
    } else {
      setWithdrawalProofFile(null)
      setValue('withdrawalProof', undefined as any, { shouldValidate: true })
    }
  }

  // Gestion du changement du document PDF
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
    } else {
      setDocumentPdfFile(null)
      setValue('documentPdf', undefined as any, { shouldValidate: true })
    }
  }

  const onSubmit = async (data: FinalRefundCIFormData) => {
    if (!user?.uid) {
      toast.error('Vous devez être connecté')
      return
    }

    // Le montant doit toujours être égal au montant total versé
    if (data.withdrawalAmount !== totalAmountPaid) {
      toast.error(`Le montant doit être égal au montant total versé (${totalAmountPaid.toLocaleString('fr-FR')} FCFA)`)
      return
    }

    if (!withdrawalProofFile) {
      toast.error('Veuillez téléverser la preuve du retrait')
      return
    }

    if (!documentPdfFile) {
      toast.error('Veuillez téléverser le document PDF signé')
      return
    }

    try {
      await requestFinalRefundCIMutation.mutateAsync({
        contractId: contract.id,
        reason: data.reason,
        withdrawalDate: data.withdrawalDate,
        withdrawalTime: data.withdrawalTime,
        withdrawalMode: data.withdrawalMode,
        withdrawalProof: withdrawalProofFile,
        documentPdf: documentPdfFile,
        userId: user.uid,
      } as any)

      reset(defaultFinalRefundCIValues)
      setWithdrawalProofFile(null)
      setDocumentPdfFile(null)
      onClose()
    } catch (error) {
      console.error('Erreur lors de la demande de remboursement final:', error)
    }
  }

  const isLoading = requestFinalRefundCIMutation.isPending

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Demande de remboursement final
          </DialogTitle>
          <DialogDescription>
            Remplissez tous les champs ci-dessous pour effectuer votre demande de remboursement final
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          {/* Informations du contrat */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <InfoIcon className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-2 text-sm flex-1">
                <p className="font-semibold text-blue-900">
                  {contract.memberFirstName} {contract.memberLastName}
                </p>
                <p className="text-blue-700">
                  Contrat #{contract.id} - Forfait {contract.subscriptionCICode}
                </p>
                <div className="grid grid-cols-2 gap-2 text-blue-700">
                  <p>
                    Montant mensuel : {contract.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA
                  </p>
                  <p>
                    Montant total versé : {totalAmountPaid.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1 : Informations du retrait */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Informations du retrait
            </h3>

            {/* Motif du retrait */}
            <div>
              <Label htmlFor="reason" className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Motif du retrait * (10-500 caractères)
              </Label>
              <Textarea
                id="reason"
                placeholder="Expliquez la raison du remboursement final..."
                rows={4}
                {...register('reason')}
                disabled={isLoading}
                className={errors.reason ? 'border-red-500' : ''}
              />
              {errors.reason && (
                <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date de retrait */}
              <div>
                <Label htmlFor="withdrawalDate" className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Date de retrait *
                </Label>
                <Input
                  id="withdrawalDate"
                  type="date"
                  {...register('withdrawalDate')}
                  disabled={isLoading}
                  className={errors.withdrawalDate ? 'border-red-500' : ''}
                  max={new Date().toISOString().split('T')[0]}
                />
                {errors.withdrawalDate && (
                  <p className="text-xs text-red-500 mt-1">{errors.withdrawalDate.message}</p>
                )}
              </div>

              {/* Heure de retrait */}
              <div>
                <Label htmlFor="withdrawalTime" className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Heure de retrait * (HH:mm)
                </Label>
                <Input
                  id="withdrawalTime"
                  type="time"
                  {...register('withdrawalTime')}
                  disabled={isLoading}
                  className={errors.withdrawalTime ? 'border-red-500' : ''}
                />
                {errors.withdrawalTime && (
                  <p className="text-xs text-red-500 mt-1">{errors.withdrawalTime.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Montant retiré (non modifiable) */}
              <div>
                <Label htmlFor="withdrawalAmount" className="flex items-center gap-2 mb-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Montant retiré (FCFA) *
                </Label>
                <Input
                  id="withdrawalAmount"
                  type="number"
                  value={totalAmountPaid}
                  disabled={true}
                  readOnly
                  className="bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Montant non modifiable : égal au montant total versé
                </p>
              </div>

              {/* Mode de retrait */}
              <div>
                <Label htmlFor="withdrawalMode" className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  Mode de retrait *
                </Label>
                <Select
                  value={watch('withdrawalMode')}
                  onValueChange={(value) => setValue('withdrawalMode', value as any, { shouldValidate: true })}
                  disabled={isLoading}
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
                {errors.withdrawalMode && (
                  <p className="text-xs text-red-500 mt-1">{errors.withdrawalMode.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2 : Pièces justificatives */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Pièces justificatives
            </h3>

            {/* Preuve du retrait */}
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
                  disabled={isLoading}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {withdrawalProofFile && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Fichier sélectionné :</span>
                    <span className="text-xs">{withdrawalProofFile.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(withdrawalProofFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                )}
                {errors.withdrawalProof && (
                  <p className="text-xs text-red-500 mt-1">{errors.withdrawalProof.message}</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Téléversez une photo de la preuve du retrait (JPEG, PNG, WebP, max 20MB)
              </p>
            </div>

            {/* Document PDF signé */}
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
                  disabled={isLoading}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
                {documentPdfFile && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">PDF sélectionné :</span>
                    <span className="text-xs">{documentPdfFile.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(documentPdfFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                )}
                {errors.documentPdf && (
                  <p className="text-xs text-red-500 mt-1">{errors.documentPdf.message}</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Téléversez le document PDF signé par le membre et l'administration (format PDF uniquement, max 10MB)
              </p>
            </div>
          </div>

          {/* Section 3 : Récapitulatif */}
          {totalAmountPaid > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Récapitulatif</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Montant total versé :</span>
                  <span className="font-semibold text-gray-900">
                    {totalAmountPaid.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Montant remboursé :</span>
                  <span className="font-semibold text-blue-600">
                    {totalAmountPaid.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-gray-600">Solde restant :</span>
                  <span className="font-semibold text-green-600">
                    0 FCFA
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Avertissement */}
          <Alert className="border-blue-200 bg-blue-50">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              <strong>Important :</strong> Le remboursement final marquera la fin du contrat. 
              Tous les versements doivent être effectués. Le montant remboursé correspond au montant total versé.
            </AlertDescription>
          </Alert>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={
              isLoading ||
              !watch('reason') ||
              !watch('withdrawalDate') ||
              !watch('withdrawalTime') ||
              !watch('withdrawalMode') ||
              !withdrawalProofFile ||
              !documentPdfFile
            }
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Soumettre la demande
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

