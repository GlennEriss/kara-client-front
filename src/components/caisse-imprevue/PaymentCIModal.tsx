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
} from 'lucide-react'
import { toast } from 'sonner'
import type { PaymentMode } from '@/types/types'
import { ImageCompressionService } from '@/services/imageCompressionService'
import { useActiveSupport } from '@/hooks/caisse-imprevue'

interface PaymentCIModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: PaymentFormData) => Promise<void>
  title: string
  description: string
  defaultDate?: string
  defaultAmount?: number
  isMonthly?: boolean
  isDateFixed?: boolean
  contractId: string
}

export interface PaymentFormData {
  date: string
  time: string
  amount: number
  mode: PaymentMode
  proofFile: File
}

export default function PaymentCIModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  defaultDate,
  defaultAmount,
  isMonthly = false,
  isDateFixed = false,
  contractId
}: PaymentCIModalProps) {
  const [paymentDate, setPaymentDate] = useState(defaultDate || new Date().toISOString().split('T')[0])
  const [paymentTime, setPaymentTime] = useState(() => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  })
  const [paymentAmount, setPaymentAmount] = useState(defaultAmount ? String(defaultAmount) : '')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('airtel_money')
  const [paymentFile, setPaymentFile] = useState<File | undefined>()
  const [isPaying, setIsPaying] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)

  // Récupérer le support actif
  const { data: activeSupport } = useActiveSupport(contractId)

  // Mettre à jour le montant si defaultAmount change
  useEffect(() => {
    if (defaultAmount) {
      setPaymentAmount(String(defaultAmount))
    }
  }, [defaultAmount])

  // Mettre à jour la date si defaultDate change et que la date est fixe
  useEffect(() => {
    if (defaultDate && isDateFixed) {
      setPaymentDate(defaultDate)
    }
  }, [defaultDate, isDateFixed])

  // Calculer la répartition du paiement (support + versement)
  const paymentBreakdown = React.useMemo(() => {
    const amount = Number(paymentAmount) || 0
    
    if (!activeSupport || activeSupport.status !== 'ACTIVE' || amount <= 0) {
      return {
        supportRepayment: 0,
        monthlyPayment: amount,
        hasSupport: false,
        isValid: true,
        errorMessage: ''
      }
    }

    // Le support doit être remboursé intégralement AVANT tout nouveau versement
    const isValid = amount >= activeSupport.amountRemaining
    const supportRepayment = activeSupport.amountRemaining
    const monthlyPayment = isValid ? amount - supportRepayment : 0

    return {
      supportRepayment,
      monthlyPayment,
      hasSupport: true,
      isValid,
      errorMessage: isValid 
        ? '' 
        : `Montant insuffisant. Vous devez verser au minimum ${activeSupport.amountRemaining.toLocaleString('fr-FR')} FCFA pour rembourser le support.`
    }
  }, [paymentAmount, activeSupport])

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

    try {
      setIsPaying(true)

      const formData: PaymentFormData = {
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
      setIsPaying(false)
    }
  }

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date et Heure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment-date" className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date de paiement *
                {isDateFixed && (
                  <span className="text-xs text-muted-foreground">(fixe)</span>
                )}
              </Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={isDateFixed}
                required
                className={isDateFixed ? 'bg-gray-100 cursor-not-allowed' : ''}
              />
              {isDateFixed && (
                <p className="text-xs text-muted-foreground mt-1">
                  📅 La date correspond au jour sélectionné dans le calendrier
                </p>
              )}
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
              />
            </div>
          </div>

          {/* Montant */}
          <div>
            <Label htmlFor="payment-amount" className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Montant du versement (FCFA) *
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
            />
            <p className="text-xs text-muted-foreground mt-1">
              {isMonthly 
                ? 'Montant minimum: 100 FCFA' 
                : '💡 Pour les paiements quotidiens, le montant peut varier chaque jour. Montant minimum: 100 FCFA'}
            </p>
          </div>

    {/* Alerte Support Actif */}
    {paymentBreakdown.hasSupport && activeSupport && (
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-700">
          <strong>⚠️ Support actif :</strong> Un support de {activeSupport.amount.toLocaleString('fr-FR')} FCFA est en cours de remboursement.
          <br />
          <strong className="text-red-700">Vous devez rembourser intégralement le support ({activeSupport.amountRemaining.toLocaleString('fr-FR')} FCFA) avant de pouvoir effectuer un nouveau versement mensuel.</strong>
        </AlertDescription>
      </Alert>
    )}

    {/* Erreur si montant insuffisant */}
    {paymentBreakdown.hasSupport && !paymentBreakdown.isValid && Number(paymentAmount) > 0 && (
      <Alert variant="destructive" className="border-red-300 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700">
          {paymentBreakdown.errorMessage}
        </AlertDescription>
      </Alert>
    )}

          {/* Répartition du paiement */}
          {paymentBreakdown.hasSupport && Number(paymentAmount) > 0 && paymentBreakdown.isValid && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Répartition du paiement
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700">Remboursement du support :</span>
                  <span className="font-bold text-orange-600">
                    {paymentBreakdown.supportRepayment.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700">Versement mensuel :</span>
                  <span className="font-bold text-green-600">
                    {paymentBreakdown.monthlyPayment.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <div className="pt-2 border-t border-blue-300">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-700 font-semibold">Total :</span>
                    <span className="font-bold text-blue-900">
                      {Number(paymentAmount).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>

                {activeSupport && (
                  <div className="pt-2 border-t border-blue-300">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-blue-600">Restant à rembourser après ce versement :</span>
                      <span className="font-semibold text-green-600">
                        0 FCFA ✅
                      </span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      ✅ Le support sera entièrement remboursé
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode de paiement */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              Mode de paiement *
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                <input
                  type="radio"
                  name="paymentMode"
                  value="airtel_money"
                  checked={paymentMode === 'airtel_money'}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
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
                  name="paymentMode"
                  value="mobicash"
                  checked={paymentMode === 'mobicash'}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
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
                  name="paymentMode"
                  value="cash"
                  checked={paymentMode === 'cash'}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
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
                  name="paymentMode"
                  value="bank_transfer"
                  checked={paymentMode === 'bank_transfer'}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
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

          {/* Preuve de paiement */}
          <div>
            <Label htmlFor="payment-proof" className="flex items-center gap-2 mb-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              Preuve de paiement *
            </Label>
            <Input
              id="payment-proof"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isCompressing || isPaying}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Formats acceptés : JPEG, PNG, WebP (max 10 MB) • ✨ Compression automatique activée
            </p>
            
            {isCompressing && (
              <Alert className="mt-2 border-blue-200 bg-blue-50">
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                <AlertDescription className="text-blue-700">
                  Compression de l'image en cours...
                </AlertDescription>
              </Alert>
            )}
            
            {paymentFile && !isCompressing && (
              <Alert className="mt-2 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  <strong>{paymentFile.name}</strong> ({(paymentFile.size / 1024).toFixed(2)} KB)
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPaying || isCompressing}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              isPaying ||
              isCompressing ||
              !paymentDate ||
              !paymentTime ||
              !paymentAmount ||
              Number(paymentAmount) <= 0 ||
              !paymentFile ||
              (paymentBreakdown.hasSupport && !paymentBreakdown.isValid)
            }
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
          >
            {isPaying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-2" />
                Enregistrer le versement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

