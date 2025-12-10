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
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Loader2,
  Calendar,
  Clock,
  DollarSign,
  Upload,
  Smartphone,
  Banknote,
  Building2,
  AlertTriangle,
  CheckCircle,
  X,
  Image as ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import type { PaymentMode, CommissionPaymentPlacement } from '@/types/types'
import { ImageCompressionService } from '@/services/imageCompressionService'

interface PayCommissionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CommissionPaymentFormData) => Promise<void>
  commission: CommissionPaymentPlacement | null
  isPaying?: boolean
}

export interface CommissionPaymentFormData {
  date: string
  time: string
  amount: number
  mode: PaymentMode
  proofFile: File
}

const PAYMENT_MODE_LABELS: Record<PaymentMode, { label: string; icon: React.ComponentType<any> }> = {
  airtel_money: { label: 'Airtel Money', icon: Smartphone },
  mobicash: { label: 'Mobicash', icon: Smartphone },
  cash: { label: 'Espèces', icon: Banknote },
  bank_transfer: { label: 'Virement bancaire', icon: Building2 },
  other: { label: 'Autre', icon: Smartphone },
}

export default function PayCommissionModal({
  isOpen,
  onClose,
  onSubmit,
  commission,
  isPaying = false,
}: PayCommissionModalProps) {
  const [paymentDate, setPaymentDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [paymentTime, setPaymentTime] = useState(() => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  })
  const [paymentAmount, setPaymentAmount] = useState(commission ? String(commission.amount) : '')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('airtel_money')
  const [paymentFile, setPaymentFile] = useState<File | undefined>()
  const [isCompressing, setIsCompressing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Mettre à jour le montant si la commission change
  useEffect(() => {
    if (commission) {
      setPaymentAmount(String(commission.amount))
    }
  }, [commission])

  // Réinitialiser le formulaire quand le modal s'ouvre
  useEffect(() => {
    if (isOpen && commission) {
      const today = new Date()
      setPaymentDate(today.toISOString().split('T')[0])
      const now = new Date()
      setPaymentTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
      setPaymentAmount(String(commission.amount))
      setPaymentMode('airtel_money')
      setPaymentFile(undefined)
    }
  }, [isOpen, commission])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setPaymentFile(undefined)
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
      
      // Compression de l'image
      const compressedFile = await ImageCompressionService.compressImage(file, 1, 1920)
      
      setPaymentFile(compressedFile)
      
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

  const handleSubmit = async () => {
    // Validation
    if (!paymentDate) {
      toast.error('Veuillez sélectionner une date')
      return
    }

    if (!paymentTime) {
      toast.error('Veuillez sélectionner une heure')
      return
    }

    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('Veuillez saisir un montant valide')
      return
    }

    if (!paymentFile) {
      toast.error('Veuillez téléverser une preuve de paiement')
      return
    }

    if (!commission) {
      toast.error('Commission introuvable')
      return
    }

    try {
      setIsSubmitting(true)

      const formData: CommissionPaymentFormData = {
        date: paymentDate,
        time: paymentTime,
        amount: Number(paymentAmount),
        mode: paymentMode,
        proofFile: paymentFile,
      }

      await onSubmit(formData)

      // Réinitialiser le formulaire
      setPaymentDate(new Date().toISOString().split('T')[0])
      setPaymentTime(() => {
        const now = new Date()
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      })
      setPaymentAmount('')
      setPaymentMode('airtel_money')
      setPaymentFile(undefined)
      
      onClose()
    } catch (error) {
      console.error('Erreur lors du paiement:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveFile = () => {
    setPaymentFile(undefined)
  }

  if (!commission) return null

  const isLoading = isSubmitting || isPaying || isCompressing

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Payer la commission
          </DialogTitle>
          <DialogDescription>
            Enregistrer le paiement de la commission du {new Date(commission.dueDate).toLocaleDateString('fr-FR')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations de la commission */}
          <Alert className="border-blue-200 bg-blue-50">
            <DollarSign className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              <strong>Montant dû :</strong> {commission.amount.toLocaleString('fr-FR')} FCFA
              <br />
              <strong>Échéance :</strong> {new Date(commission.dueDate).toLocaleDateString('fr-FR')}
            </AlertDescription>
          </Alert>

          {/* Date et Heure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment-date" className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date de paiement *
              </Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="payment-time" className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Heure de paiement *
              </Label>
              <Input
                id="payment-time"
                type="time"
                value={paymentTime}
                onChange={(e) => setPaymentTime(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Montant */}
          <div>
            <Label htmlFor="payment-amount" className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Montant payé (FCFA) *
            </Label>
            <Input
              id="payment-amount"
              type="number"
              placeholder="Ex: 10000"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              min="100"
              step="100"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Montant minimum: 100 FCFA
            </p>
          </div>

          {/* Mode de paiement */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              Mode de paiement *
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(PAYMENT_MODE_LABELS).map(([mode, { label, icon: Icon }]) => (
                <label
                  key={mode}
                  className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5"
                >
                  <input
                    type="radio"
                    name="payment-mode"
                    value={mode}
                    checked={paymentMode === mode}
                    onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                    disabled={isLoading}
                    className="sr-only"
                  />
                  <Icon className="h-5 w-5 mr-3 text-[#224D62]" />
                  <span className="text-sm font-medium">{label}</span>
                  {paymentMode === mode && (
                    <CheckCircle className="h-5 w-5 ml-auto text-[#224D62]" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Preuve de paiement */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              Preuve de paiement (image) *
            </Label>
            {!paymentFile ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#224D62] transition-colors">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isLoading || isCompressing}
                  className="hidden"
                  id="proof-upload"
                />
                <Label
                  htmlFor="proof-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Cliquez pour sélectionner une image
                  </span>
                  <span className="text-xs text-gray-500">
                    Formats acceptés: JPG, PNG (max 10MB)
                  </span>
                </Label>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="h-8 w-8 text-[#224D62]" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{paymentFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {ImageCompressionService.formatFileSize(paymentFile.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    disabled={isLoading}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            {isCompressing && (
              <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Compression de l'image en cours...
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#1a3a4d] hover:to-[#234D65] text-white"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer le paiement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

