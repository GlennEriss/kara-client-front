/**
 * Modal de paiement V2 pour une demande d'adhésion
 * 
 * Suit les diagrammes de séquence et la logique métier
 * Optimisé selon le feedback UX des testeurs
 */

'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { CreditCard, Loader2, Upload, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import type { PaymentMode } from '@/constantes/membership-requests'
import { PAYMENT_MODE_LABELS } from '@/constantes/membership-requests'
import { ImageCompressionService } from '@/services/imageCompressionService'
import { getStorageInstance, ref, uploadBytes, getDownloadURL } from '@/firebase/storage'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface PaymentModalV2Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: {
    amount: number
    mode: PaymentMode
    date: string
    time: string
    paymentType?: 'Membership' | 'Subscription' | 'Tontine' | 'Charity'
    withFees?: boolean
    paymentMethodOther?: string
    proofUrl?: string
    proofPath?: string
    proofJustification?: string // Justification si pas de preuve
  }) => Promise<void>
  requestId: string
  memberName: string
  isLoading?: boolean
}

const VALID_PAYMENT_MODES: PaymentMode[] = ['airtel_money', 'mobicash', 'cash', 'bank_transfer', 'other']
const DEFAULT_AMOUNT = 10300
const MOBILE_MONEY_MODES: PaymentMode[] = ['airtel_money', 'mobicash']

export function PaymentModalV2({
  isOpen,
  onClose,
  onConfirm,
  requestId,
  memberName,
  isLoading = false,
}: PaymentModalV2Props) {
  // États des champs (ordre logique : Type → Date/Heure → Montant → Mode → Frais → Preuve)
  const [paymentType, setPaymentType] = useState<'Membership' | 'Subscription' | 'Tontine' | 'Charity'>('Membership')
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState<string>('')
  const [amount, setAmount] = useState<string>(DEFAULT_AMOUNT.toString())
  const [mode, setMode] = useState<PaymentMode | ''>('')
  const [withFees, setWithFees] = useState<string>('')
  const [paymentMethodOther, setPaymentMethodOther] = useState<string>('')
  
  // États pour la preuve de paiement
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [proofUrl, setProofUrl] = useState<string | undefined>(undefined)
  const [proofPath, setProofPath] = useState<string | undefined>(undefined)
  const [proofJustification, setProofJustification] = useState<string>('')
  const [hasProof, setHasProof] = useState<boolean>(false) // true si preuve uploadée, false si justification
  
  // États pour le feedback upload
  const [isCompressing, setIsCompressing] = useState<boolean>(false)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [originalSize, setOriginalSize] = useState<string>('')
  const [compressedSize, setCompressedSize] = useState<string>('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const amountNum = parseFloat(amount) || 0
  
  // Validation complète
  const isValid = 
    amountNum > 0 &&
    VALID_PAYMENT_MODES.includes(mode as PaymentMode) &&
    date.trim() !== '' &&
    time.trim() !== '' &&
    (mode !== 'other' || paymentMethodOther.trim() !== '') &&
    (!MOBILE_MONEY_MODES.includes(mode as PaymentMode) || withFees !== '') &&
    // Preuve obligatoire : soit uploadée, soit justifiée
    (hasProof || proofJustification.trim().length >= 20)

  // Réinitialiser les états à la fermeture
  useEffect(() => {
    if (!isOpen) {
      setPaymentType('Membership')
      setDate(new Date().toISOString().split('T')[0])
      setTime('')
      setAmount(DEFAULT_AMOUNT.toString())
      setMode('')
      setWithFees('')
      setPaymentMethodOther('')
      setProofFile(null)
      setProofPreview(null)
      setProofUrl(undefined)
      setProofPath(undefined)
      setProofJustification('')
      setHasProof(false)
      setIsCompressing(false)
      setIsUploading(false)
      setUploadProgress(0)
      setOriginalSize('')
      setCompressedSize('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [isOpen])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validation du type
    if (!ImageCompressionService.isValidImageFile(file)) {
      toast.error('Veuillez sélectionner une image (JPG, PNG, WEBP)')
      return
    }
    
    // Validation de la taille (max 5MB avant compression)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image est trop volumineuse (max 5MB)')
      return
    }

    setOriginalSize(ImageCompressionService.formatFileSize(file.size))
    setProofFile(file)
    setHasProof(false) // Reset jusqu'à ce que l'upload soit terminé
    setProofJustification('') // Réinitialiser la justification si on upload une preuve
    
    // Créer une preview immédiate
    const reader = new FileReader()
    reader.onloadend = () => {
      setProofPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Compression et upload
    setIsCompressing(true)
    setUploadProgress(10)

    try {
      // Étape 1 : Compression (profil rapide pour preuve de paiement ; ignorée si < 2 MB)
      toast.info('Compression de l\'image en cours...', { duration: 2000 })
      const compressedFile = await ImageCompressionService.compressPaymentProofImage(file)
      setCompressedSize(ImageCompressionService.formatFileSize(compressedFile.size))
      setUploadProgress(50)
      setIsCompressing(false)
      setIsUploading(true)

      // Étape 2 : Upload vers Firebase Storage
      toast.info('Téléversement de l\'image...', { duration: 2000 })
      const storage = getStorageInstance()
      const timestamp = Date.now()
      const fileName = `payment-proof-${requestId}-${timestamp}.${compressedFile.name.split('.').pop()}`
      const filePath = `payment-proofs/${fileName}`
      const storageRef = ref(storage, filePath)

      await uploadBytes(storageRef, compressedFile)
      setUploadProgress(90)

      // Étape 3 : Récupérer l'URL
      const downloadURL = await getDownloadURL(storageRef)
      setProofUrl(downloadURL)
      setProofPath(filePath)
      setHasProof(true)
      setUploadProgress(100)

      toast.success('Preuve de paiement uploadée avec succès!', {
        description: `Taille réduite de ${originalSize} à ${compressedSize}`,
        duration: 4000,
      })
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error)
      toast.error('Erreur lors de l\'upload de la preuve', {
        description: error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite'
      })
      setProofFile(null)
      setProofPreview(null)
      setHasProof(false)
    } finally {
      setIsCompressing(false)
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleRemoveProof = () => {
    setProofFile(null)
    setProofPreview(null)
    setProofUrl(undefined)
    setProofPath(undefined)
    setHasProof(false)
    setProofJustification('')
    setOriginalSize('')
    setCompressedSize('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleModeChange = (value: PaymentMode) => {
    setMode(value)
    if (value === 'cash') {
      setWithFees('no')
    } else if (!MOBILE_MONEY_MODES.includes(value)) {
      setWithFees('')
    }
    if (value !== 'other') {
      setPaymentMethodOther('')
    }
  }

  const handleConfirm = async () => {
    if (!isValid) {
      return
    }

    await onConfirm({
      amount: amountNum,
      mode: mode as PaymentMode,
      date: date,
      time: time.trim(),
      paymentType,
      withFees: MOBILE_MONEY_MODES.includes(mode as PaymentMode) ? withFees === 'yes' : undefined,
      paymentMethodOther: mode === 'other' ? paymentMethodOther.trim() : undefined,
      proofUrl,
      proofPath,
      proofJustification: !hasProof ? proofJustification.trim() : undefined,
    })
  }

  const handleClose = () => {
    if (!isLoading && !isCompressing && !isUploading) {
      onClose()
    }
  }

  const showFeesField = MOBILE_MONEY_MODES.includes(mode as PaymentMode)
  const showOtherField = mode === 'other'
  const isProcessing = isCompressing || isUploading || isLoading

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" data-testid="modal-payment">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-kara-primary-dark">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Enregistrer un paiement
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Vous êtes sur le point d'enregistrer un paiement pour la demande de <strong>{memberName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 1. Type de paiement */}
          <div className="space-y-2">
            <Label htmlFor="paymentType" className="text-sm font-semibold text-kara-primary-dark">
              Type de paiement <span className="text-red-500">*</span>
            </Label>
            <Select
              value={paymentType}
              onValueChange={(value) => setPaymentType(value as any)}
              disabled={isProcessing}
            >
              <SelectTrigger id="paymentType" className="h-10" data-testid="payment-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Membership">Adhésion</SelectItem>
                <SelectItem value="Subscription">Souscription</SelectItem>
                <SelectItem value="Tontine">Tontine</SelectItem>
                <SelectItem value="Charity">Bienfaisance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 2. Date et Heure (sur une ligne en desktop) */}
          {isDesktop ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-semibold text-kara-primary-dark">
                  Date de versement <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isProcessing}
                  className="h-10"
                  required
                  data-testid="payment-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="text-sm font-semibold text-kara-primary-dark">
                  Heure de versement <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={isProcessing}
                  className="h-10"
                  required
                  data-testid="payment-time"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-semibold text-kara-primary-dark">
                  Date de versement <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isProcessing}
                  className="h-10"
                  required
                  data-testid="payment-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="text-sm font-semibold text-kara-primary-dark">
                  Heure de versement <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={isProcessing}
                  className="h-10"
                  required
                  data-testid="payment-time"
                />
              </div>
            </>
          )}

          {/* 3. Montant */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-semibold text-kara-primary-dark">
              Montant (FCFA) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10300"
              disabled={isProcessing}
              className="h-10"
              min="0"
              step="100"
              data-testid="payment-amount"
            />
            <p className="text-xs text-gray-500">Montant par défaut: 10 300 FCFA (cotisation d'adhésion)</p>
          </div>

          {/* 4. Mode de paiement */}
          <div className="space-y-2">
            <Label htmlFor="mode" className="text-sm font-semibold text-kara-primary-dark">
              Mode de paiement <span className="text-red-500">*</span>
            </Label>
            <Select
              value={mode}
              onValueChange={handleModeChange}
              disabled={isProcessing}
            >
              <SelectTrigger id="mode" className="h-10" data-testid="payment-mode">
                <SelectValue placeholder="Sélectionner un mode de paiement" />
              </SelectTrigger>
              <SelectContent>
                {VALID_PAYMENT_MODES.map((paymentMode) => (
                  <SelectItem key={paymentMode} value={paymentMode}>
                    {PAYMENT_MODE_LABELS[paymentMode] || paymentMode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Champ "Autre" mode de paiement */}
          {showOtherField && (
            <div className="space-y-2">
              <Label htmlFor="paymentMethodOther" className="text-sm font-semibold text-kara-primary-dark">
                Précisez le mode de paiement <span className="text-red-500">*</span>
              </Label>
              <Input
                id="paymentMethodOther"
                type="text"
                value={paymentMethodOther}
                onChange={(e) => setPaymentMethodOther(e.target.value)}
                placeholder="Ex: Orange Money, Chèque, etc."
                disabled={isProcessing}
                className="h-10"
                required
                data-testid="payment-method-other"
              />
            </div>
          )}

          {/* 5. Frais (si Airtel Money ou Mobicash) */}
          {showFeesField && (
            <div className="space-y-2">
              <Label htmlFor="withFees" className="text-sm font-semibold text-kara-primary-dark">
                Frais <span className="text-red-500">*</span>
              </Label>
              <Select
                value={withFees}
                onValueChange={(value) => setWithFees(value)}
                disabled={isProcessing}
              >
                <SelectTrigger id="withFees" className="h-10" data-testid="payment-with-fees">
                  <SelectValue placeholder="Avec ou sans frais?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Avec frais</SelectItem>
                  <SelectItem value="no">Sans frais</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Indiquez si le montant reçu inclut les frais de transaction ou non.
              </p>
            </div>
          )}

          {/* Message pour cash */}
          {mode === 'cash' && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600">
                ℹ️ Le paiement en espèce n'a pas de frais.
              </p>
            </div>
          )}

          {/* 6. Preuve de paiement (OBLIGATOIRE) */}
          <div className="space-y-2">
            <Label htmlFor="proof" className="text-sm font-semibold text-kara-primary-dark">
              Preuve de paiement <span className="text-red-500">*</span>
            </Label>
            
            {!hasProof && !proofPreview ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      ref={fileInputRef}
                      id="proof"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={isProcessing}
                      className="h-10"
                      data-testid="payment-proof-file"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="shrink-0"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choisir
                    </Button>
                  </div>
                  
                  {/* Feedback compression/upload */}
                  {(isCompressing || isUploading) && (
                    <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="text-sm text-blue-700">
                          {isCompressing ? 'Compression en cours...' : 'Téléversement en cours...'}
                        </span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                      {originalSize && compressedSize && (
                        <p className="text-xs text-blue-600">
                          Taille: {originalSize} → {compressedSize}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Justification si pas de preuve (cas exceptionnel) */}
                <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <Label htmlFor="proofJustification" className="text-sm font-medium text-amber-800">
                    Justification (si pas de preuve) <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="proofJustification"
                    value={proofJustification}
                    onChange={(e) => setProofJustification(e.target.value)}
                    placeholder="Expliquez pourquoi la preuve de paiement n'est pas disponible (min 20 caractères)..."
                    disabled={isProcessing || hasProof}
                    className="mt-2 min-h-[80px]"
                    maxLength={500}
                    data-testid="payment-proof-justification"
                  />
                  <p className="text-xs text-amber-700 mt-1">
                    {proofJustification.length}/500 caractères (minimum 20 requis)
                  </p>
                </div>
              </>
            ) : (
              <div className="relative">
                <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                  <div className="flex items-center gap-3">
                    {hasProof ? (
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {proofFile?.name || 'Preuve uploadée'}
                      </p>
                      {originalSize && compressedSize && (
                        <p className="text-xs text-gray-500">
                          {originalSize} → {compressedSize}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveProof}
                      disabled={isProcessing}
                      className="shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {proofPreview && (
                    <img
                      src={proofPreview}
                      alt="Aperçu de la preuve"
                      className="mt-2 max-h-32 w-full object-contain rounded border border-gray-200"
                    />
                  )}
                </div>
              </div>
            )}
            
            <p className="text-xs text-gray-500">
              Photo/Capture obligatoire (JPG/PNG/WEBP, max 5MB) ou justification requise
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
            className="border-gray-300"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || !isValid}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="confirm-payment"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isCompressing ? 'Compression...' : isUploading ? 'Téléversement...' : 'Enregistrement...'}
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Enregistrer le paiement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
