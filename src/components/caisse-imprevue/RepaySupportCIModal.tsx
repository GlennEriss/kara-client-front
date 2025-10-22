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
  DollarSign,
  AlertTriangle,
  Upload,
  CheckCircle,
  Calendar as CalendarIcon,
  Clock,
  Image as ImageIcon,
} from 'lucide-react'
import { SupportCI } from '@/types/types'
import { toast } from 'sonner'
import { ImageCompressionService } from '@/services/imageCompressionService'

interface RepaySupportCIModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    date: string
    time: string
    amount: number
    proofFile: File
  }) => Promise<void>
  activeSupport: SupportCI
  defaultDate?: string
  isDateFixed?: boolean
  monthOrDayLabel?: string
}

export default function RepaySupportCIModal({
  isOpen,
  onClose,
  activeSupport,
  defaultDate,
  isDateFixed = false,
  monthOrDayLabel = '',
  onSubmit,
}: RepaySupportCIModalProps) {
  const [paymentDate, setPaymentDate] = useState(defaultDate || '')
  const [paymentTime, setPaymentTime] = useState('')
  const [paymentAmount, setPaymentAmount] = useState(activeSupport.amountRemaining.toString())
  const [paymentFile, setPaymentFile] = useState<File | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [isPaying, setIsPaying] = useState(false)

  // Initialiser la date et l'heure
  useEffect(() => {
    if (isOpen) {
      if (defaultDate) {
        setPaymentDate(defaultDate)
      } else {
        const today = new Date()
        setPaymentDate(today.toISOString().split('T')[0])
      }

      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      setPaymentTime(`${hours}:${minutes}`)

      // Toujours pré-remplir avec le montant exact restant
      setPaymentAmount(activeSupport.amountRemaining.toString())
    }
  }, [isOpen, defaultDate, activeSupport.amountRemaining])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image')
      return
    }

    setIsCompressing(true)
    try {
      const compressedFile = await ImageCompressionService.compressImage(file)
      setPaymentFile(compressedFile)
      toast.success('Image compressée avec succès')
    } catch (error) {
      console.error('Erreur lors de la compression:', error)
      toast.error('Erreur lors de la compression de l\'image')
      setPaymentFile(file)
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

    const amount = Number(paymentAmount)

    // Vérification : le montant doit être >= au montant restant
    if (amount < activeSupport.amountRemaining) {
      toast.error(
        `Le montant doit être au minimum de ${activeSupport.amountRemaining.toLocaleString('fr-FR')} FCFA pour rembourser intégralement le support`
      )
      return
    }

    if (!paymentFile) {
      toast.error('Veuillez télécharger une preuve de paiement')
      return
    }

    setIsPaying(true)
    try {
      await onSubmit({
        date: paymentDate,
        time: paymentTime,
        amount,
        proofFile: paymentFile,
      })

      // Réinitialiser le formulaire
      setPaymentDate('')
      setPaymentTime('')
      setPaymentAmount('')
      setPaymentFile(null)
      onClose()
    } catch (error) {
      console.error('Erreur lors du remboursement:', error)
      // L'erreur est déjà gérée par le parent
    } finally {
      setIsPaying(false)
    }
  }

  const remainingAfterPayment = Math.max(0, activeSupport.amountRemaining - Number(paymentAmount || 0))
  const isValidAmount = Number(paymentAmount || 0) >= activeSupport.amountRemaining

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-orange-700 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            Remboursement du Support
          </DialogTitle>
          <DialogDescription>
            {monthOrDayLabel && `${monthOrDayLabel} - `}
            Remboursement obligatoire avant tout nouveau versement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Alerte Support */}
          <Alert className="border-orange-300 bg-orange-50">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <p className="font-bold text-lg mb-2">Support actif en cours</p>
              <div className="space-y-1 text-sm">
                <p>• Montant total du support : <strong>{activeSupport.amount.toLocaleString('fr-FR')} FCFA</strong></p>
                <p>• Déjà remboursé : <strong>{activeSupport.amountRepaid.toLocaleString('fr-FR')} FCFA</strong></p>
                <p className="text-base font-bold text-red-700 mt-2">
                  • Montant restant à rembourser : {activeSupport.amountRemaining.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Information importante */}
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800 text-sm">
              <strong>ℹ️ Information :</strong> Vous devez rembourser <strong>intégralement</strong> le support 
              ({activeSupport.amountRemaining.toLocaleString('fr-FR')} FCFA) avant de pouvoir effectuer 
              un nouveau versement mensuel. Si vous versez plus, le surplus sera ajouté à votre versement mensuel.
            </AlertDescription>
          </Alert>

          {/* Date */}
          <div>
            <Label htmlFor="repay-date" className="flex items-center gap-2 mb-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              Date du remboursement *
              {isDateFixed && (
                <span className="text-xs text-muted-foreground">(fixe)</span>
              )}
            </Label>
            <Input
              id="repay-date"
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

          {/* Heure */}
          <div>
            <Label htmlFor="repay-time" className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Heure du remboursement *
            </Label>
            <Input
              id="repay-time"
              type="time"
              value={paymentTime}
              onChange={(e) => setPaymentTime(e.target.value)}
              required
            />
          </div>

          {/* Montant */}
          <div>
            <Label htmlFor="repay-amount" className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Montant du remboursement (FCFA) *
            </Label>
            <Input
              id="repay-amount"
              type="number"
              placeholder={`Minimum: ${activeSupport.amountRemaining.toLocaleString('fr-FR')}`}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              min={activeSupport.amountRemaining}
              step="100"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              💡 Montant minimum requis : {activeSupport.amountRemaining.toLocaleString('fr-FR')} FCFA
            </p>
          </div>

          {/* Alerte si montant insuffisant */}
          {!isValidAmount && Number(paymentAmount) > 0 && (
            <Alert variant="destructive" className="border-red-300 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                ❌ Montant insuffisant. Vous devez verser au minimum {activeSupport.amountRemaining.toLocaleString('fr-FR')} FCFA.
              </AlertDescription>
            </Alert>
          )}

          {/* Répartition si montant valide */}
          {isValidAmount && Number(paymentAmount) > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-green-900 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Répartition du paiement
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700">Remboursement du support :</span>
                  <span className="font-bold text-orange-600">
                    {activeSupport.amountRemaining.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700">Versement mensuel :</span>
                  <span className="font-bold text-blue-600">
                    {remainingAfterPayment.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <div className="pt-2 border-t border-green-300">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-700 font-semibold">Total :</span>
                    <span className="font-bold text-green-900">
                      {Number(paymentAmount).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-green-300">
                  <p className="text-xs text-green-700 font-semibold flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    ✅ Le support sera entièrement remboursé et vous pourrez à nouveau effectuer des versements normaux
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Preuve de paiement */}
          <div>
            <Label htmlFor="repay-proof" className="flex items-center gap-2 mb-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              Preuve de remboursement (Image) *
            </Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('repay-proof')?.click()}
                disabled={isCompressing || isPaying}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {paymentFile ? 'Changer l\'image' : 'Télécharger une image'}
              </Button>
              {paymentFile && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  {paymentFile.name}
                </span>
              )}
              {isCompressing && (
                <span className="text-sm text-blue-600 flex items-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Compression...
                </span>
              )}
            </div>
            <input
              id="repay-proof"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground mt-1">
              📸 Capture d'écran ou photo du reçu de paiement
            </p>
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
              !isValidAmount ||
              !paymentFile
            }
            className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
          >
            {isPaying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Rembourser le support
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

