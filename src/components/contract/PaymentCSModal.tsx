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
  Calendar,
  Clock,
  DollarSign,
  Smartphone,
  Banknote,
  Building2,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { PaymentMode } from '@/types/types'
import { toast } from 'sonner'
import { compressImage, IMAGE_COMPRESSION_PRESETS } from '@/lib/utils'
import { AgentRecouvrementSelect } from '@/components/agent-recouvrement/AgentRecouvrementSelect'

export interface PaymentCSFormData {
  date: string
  time: string
  amount: number
  mode: PaymentMode
  proofFile: File
  agentRecouvrementId?: string
}

interface PaymentCSModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: PaymentCSFormData) => Promise<void>
  title: string
  description: string
  defaultAmount?: number
  isGroupContract?: boolean
  groupMemberName?: string
}

export default function PaymentCSModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  defaultAmount = 0,
  isGroupContract = false,
  groupMemberName,
}: PaymentCSModalProps) {
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

  // Réinitialiser le formulaire quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        time: (() => {
          const now = new Date()
          return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
        })(),
        amount: defaultAmount,
        mode: 'airtel_money',
      })
      setProofFile(undefined)
      setAgentRecouvrementId('')
    }
  }, [isOpen, defaultAmount])

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
    if (!formData.date || !formData.time || !formData.amount || !formData.mode || !proofFile) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    if (formData.amount <= 0) {
      toast.error('Le montant doit être supérieur à 0')
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit({
        date: formData.date!,
        time: formData.time!,
        amount: formData.amount!,
        mode: formData.mode!,
        proofFile: proofFile!,
        agentRecouvrementId: agentRecouvrementId || undefined,
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
              <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                <input
                  type="radio"
                  name="paymentMode"
                  value="airtel_money"
                  checked={formData.mode === 'airtel_money'}
                  onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value as PaymentMode }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value as PaymentMode }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value as PaymentMode }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value as PaymentMode }))}
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
            <Label htmlFor="proof" className="flex items-center gap-2 mb-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              Preuve de paiement *
            </Label>
            <Input
              id="proof"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isCompressing || isSubmitting}
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
            
            {proofFile && !isCompressing && (
              <Alert className="mt-2 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  <strong>{proofFile.name}</strong> ({(proofFile.size / 1024).toFixed(2)} KB)
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
              !proofFile
            }
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
          >
            {isSubmitting ? (
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
