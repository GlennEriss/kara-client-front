'use client'

import { AgentRecouvrementSelect } from '@/components/agent-recouvrement/AgentRecouvrementSelect'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { compressImage, IMAGE_COMPRESSION_PRESETS } from '@/lib/utils'
import { PaymentMode } from '@/types/types'
import {
    AlertTriangle,
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

export interface PaymentCSFormData {
  date: string
  time: string
  amount: number
  mode: PaymentMode
  /** Airtel/Mobicash: true = avec frais, false = sans frais */
  withFees?: boolean
  /** Libellé du moyen de paiement si mode = other */
  paymentMethodOther?: string
  proofFile?: File // optionnel en mode modification (conservation de l'ancienne preuve si non fournie)
  agentRecouvrementId?: string
  /** Motif de la modification (obligatoire en mode modification) */
  modificationReason?: string
}

interface PaymentCSModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: PaymentCSFormData) => Promise<void>
  title: string
  description: string
  defaultAmount?: number
  /** Données initiales pour le mode modification (préremplit le formulaire) */
  initialData?: { date: string; time: string; amount: number; mode: PaymentMode; withFees?: boolean; paymentMethodOther?: string; proofUrl?: string; agentRecouvrementId?: string }
  /** Libellé du bouton de soumission (ex: "Modifier le versement" en édition) */
  submitLabel?: string
  isGroupContract?: boolean
  groupMemberName?: string
  /** Désactive le champ montant (ex: Standard / Standard Charitable : montant fixe non modifiable) */
  amountDisabled?: boolean
}

const isEditMode = (initialData: PaymentCSModalProps['initialData']) => initialData != null

export default function PaymentCSModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  defaultAmount = 0,
  initialData,
  submitLabel,
  isGroupContract = false,
  groupMemberName,
  amountDisabled = false,
}: PaymentCSModalProps) {
  const editMode = isEditMode(initialData)
  const [formData, setFormData] = useState<Partial<PaymentCSFormData>>({
    date: new Date().toISOString().split('T')[0],
    time: (() => {
      const now = new Date()
      return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    })(),
    amount: defaultAmount,
    mode: 'airtel_money',
  })
  const [proofFile, setProofFile] = useState<File | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [agentRecouvrementId, setAgentRecouvrementId] = useState<string>('')
  const [modificationReason, setModificationReason] = useState<string>('')

  // Réinitialiser / préremplir le formulaire quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          date: initialData.date,
          time: initialData.time,
          amount: initialData.amount,
          mode: initialData.mode,
          withFees: initialData.withFees,
          paymentMethodOther: initialData.paymentMethodOther,
        })
        setAgentRecouvrementId(initialData.agentRecouvrementId ?? '')
      } else {
        setFormData({
          date: new Date().toISOString().split('T')[0],
          time: (() => {
            const now = new Date()
            return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
          })(),
          amount: defaultAmount,
          mode: 'airtel_money',
          withFees: undefined,
          paymentMethodOther: undefined,
        })
        setAgentRecouvrementId('')
      }
      setProofFile(undefined)
      setModificationReason('')
    }
  }, [isOpen, defaultAmount, initialData])

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

    if (file.size > 10 * 1024 * 1024) { // Max 10MB before compression
      toast.error('La taille du fichier ne doit pas dépasser 10 MB')
      e.target.value = ''
      return
    }

    try {
      setIsCompressing(true)

      // Compresser l'image et obtenir le data URL
      const dataUrl = await compressImage(file, IMAGE_COMPRESSION_PRESETS.document)
      
      // Convertir le data URL en Blob puis en File
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const webpFile = new File([blob], 'proof.webp', { type: 'image/webp' })

      setProofFile(webpFile)

      const originalSize = (file.size / 1024 / 1024).toFixed(2)
      const compressedSize = (webpFile.size / 1024 / 1024).toFixed(2)
      const reduction = (((file.size - webpFile.size) / file.size) * 100).toFixed(1)

      toast.success(`Image compressée avec succès`, {
        description: `${originalSize} MB → ${compressedSize} MB (${reduction}% de réduction)`
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
    if (!formData.date || !formData.time || !formData.amount || !formData.mode) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    if (!editMode && !proofFile) {
      toast.error('Veuillez joindre une preuve de paiement')
      return
    }
    if (editMode && (!modificationReason || !modificationReason.trim())) {
      toast.error('Veuillez indiquer le motif de la modification')
      return
    }

    if (formData.amount <= 0) {
      toast.error('Le montant doit être supérieur à 0')
      return
    }
    if ((formData.mode === 'airtel_money' || formData.mode === 'mobicash') && formData.withFees === undefined) {
      toast.error('Veuillez indiquer si le paiement est avec frais ou sans frais')
      return
    }
    if (formData.mode === 'other' && !formData.paymentMethodOther?.trim()) {
      toast.error('Veuillez renseigner le nom exact du moyen de paiement')
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit({
        date: formData.date!,
        time: formData.time!,
        amount: formData.amount!,
        mode: formData.mode!,
        ...(formData.mode === 'airtel_money' || formData.mode === 'mobicash'
          ? { withFees: formData.withFees }
          : {}),
        ...(formData.mode === 'other'
          ? { paymentMethodOther: formData.paymentMethodOther?.trim() }
          : {}),
        ...(proofFile && { proofFile }),
        agentRecouvrementId: agentRecouvrementId || undefined,
        ...(editMode && modificationReason.trim() && { modificationReason: modificationReason.trim() }),
      })
      
      // Réinitialiser le formulaire
      setFormData({
        date: new Date().toISOString().split('T')[0],
        time: (() => {
          const now = new Date()
          return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
        })(),
        amount: defaultAmount,
        mode: 'airtel_money',
        withFees: undefined,
        paymentMethodOther: undefined,
      })
      setProofFile(undefined)
      setAgentRecouvrementId('')
      
      onClose()
    } catch (error) {
      console.error('Erreur lors de la soumission:', error)
      // L'erreur est déjà gérée par le composant parent
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
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations du membre (si contrat de groupe) */}
          {isGroupContract && groupMemberName && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                <strong>Paiement pour :</strong> {groupMemberName}
              </AlertDescription>
            </Alert>
          )}

          {/* Date et Heure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date" className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date de paiement *
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="time" className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Heure de paiement *
              </Label>
              <Input
                id="time"
                type="time"
                value={formData.time || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Montant */}
          <div>
            <Label htmlFor="amount" className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Montant du versement (FCFA) *
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="Ex: 100000"
              value={formData.amount || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
              min="100"
              step="100"
              required
              disabled={amountDisabled}
              className={amountDisabled ? 'bg-muted cursor-not-allowed' : ''}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {amountDisabled ? 'Montant fixe défini par le contrat (Standard / Standard Charitable).' : 'Montant minimum: 100 FCFA'}
            </p>
          </div>

          {/* Agent de recouvrement */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              Agent de recouvrement (optionnel)
            </Label>
            <AgentRecouvrementSelect
              value={agentRecouvrementId}
              onValueChange={setAgentRecouvrementId}
              placeholder="Sélectionner l'agent ayant collecté le versement"
              required={false}
            />
          </div>

          {/* Moyen de paiement */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              Moyen de paiement *
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                <input
                  type="radio"
                  name="paymentMode"
                  value="airtel_money"
                  checked={formData.mode === 'airtel_money'}
                  onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value as PaymentMode, paymentMethodOther: undefined }))}
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
                  checked={formData.mode === 'mobicash'}
                  onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value as PaymentMode, paymentMethodOther: undefined }))}
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
                  checked={formData.mode === 'cash'}
                  onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value as PaymentMode, withFees: undefined, paymentMethodOther: undefined }))}
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
                  checked={formData.mode === 'bank_transfer'}
                  onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value as PaymentMode, withFees: undefined, paymentMethodOther: undefined }))}
                  className="text-[#224D62] focus:ring-[#224D62]"
                />
                <div className="ml-3 flex items-center gap-3">
                  <div className="bg-purple-100 rounded-lg p-2">
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="font-medium text-gray-900">Virement bancaire</span>
                </div>
              </label>

              <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                <input
                  type="radio"
                  name="paymentMode"
                  value="other"
                  checked={formData.mode === 'other'}
                  onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value as PaymentMode, withFees: undefined }))}
                  className="text-[#224D62] focus:ring-[#224D62]"
                />
                <div className="ml-3 flex items-center gap-3">
                  <div className="bg-slate-100 rounded-lg p-2">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>
                  <span className="font-medium text-gray-900">Autres</span>
                </div>
              </label>
            </div>
            {(formData.mode === 'airtel_money' || formData.mode === 'mobicash') && (
              <div className="mt-3">
                <Label className="text-sm font-medium">Frais de transaction *</Label>
                <Select
                  value={formData.withFees === undefined ? '' : formData.withFees ? 'yes' : 'no'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, withFees: value === 'yes' }))}
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
            {formData.mode === 'other' && (
              <div className="mt-3">
                <Label htmlFor="payment-method-other" className="text-sm font-medium">
                  Nom exact du moyen de paiement *
                </Label>
                <Input
                  id="payment-method-other"
                  type="text"
                  placeholder="Ex: Wave, Orange Money, Chèque..."
                  value={formData.paymentMethodOther || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentMethodOther: e.target.value }))}
                  className="mt-1"
                />
              </div>
            )}
          </div>

          {/* Preuve de paiement */}
          <div>
            <Label htmlFor="proof" className="flex items-center gap-2 mb-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              {editMode ? 'Preuve de paiement (remplacer si besoin)' : 'Preuve de paiement *'}
            </Label>
            {editMode && initialData?.proofUrl && (
              <div className="mb-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Preuve actuelle
                </p>
                <a
                  href={initialData.proofUrl}
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
              id="proof"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isCompressing || isSubmitting}
              required={!editMode}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {editMode ? 'Choisir un fichier pour remplacer la preuve (l\'ancienne sera supprimée).' : 'Formats acceptés : JPEG, PNG, WebP (max 10 MB) • ✨ Compression automatique activée'}
            </p>
            
            {isCompressing && (
              <Alert className="mt-2 border-blue-200 bg-blue-50">
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                <AlertDescription className="text-blue-700">
                  Compression de l'image en cours...
                </AlertDescription>
              </Alert>
            )}
            
            {proofFile && !isCompressing && (
              <Alert className="mt-2 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  <strong>{proofFile.name}</strong> ({(proofFile.size / 1024).toFixed(2)} KB) — remplacera la preuve actuelle
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Motif de modification (mode édition uniquement) */}
          {editMode && (
            <div>
              <Label htmlFor="modificationReason" className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Motif de la modification *
              </Label>
              <textarea
                id="modificationReason"
                value={modificationReason}
                onChange={(e) => setModificationReason(e.target.value)}
                placeholder="Ex: Correction de la date de paiement, changement de montant suite à erreur..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
                required
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting || isCompressing}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              isCompressing ||
              !formData.date ||
              !formData.time ||
              !formData.amount ||
              !formData.mode ||
              ((formData.mode === 'airtel_money' || formData.mode === 'mobicash') && formData.withFees === undefined) ||
              (formData.mode === 'other' && !formData.paymentMethodOther?.trim()) ||
              (!editMode && !proofFile) ||
              (editMode && !modificationReason.trim())
            }
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {editMode ? 'Modification...' : 'Enregistrement...'}
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-2" />
                {submitLabel ?? 'Enregistrer le versement'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
