'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
} from 'lucide-react'
import { PaymentMode } from '@/types/types'
import { toast } from 'sonner'
import { compressImage, IMAGE_COMPRESSION_PRESETS } from '@/lib/utils'

export interface PaymentCSFormData {
  date: string
  time: string
  amount: number
  mode: PaymentMode
  proofFile: File
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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
      })
      onClose()
    } catch (error) {
      console.error('Erreur lors de la soumission:', error)
      // L'erreur est déjà gérée par le composant parent
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPaymentModeIcon = (mode: PaymentMode) => {
    switch (mode) {
      case 'airtel_money':
        return <Smartphone className="h-4 w-4" />
      case 'mobicash':
        return <Banknote className="h-4 w-4" />
      case 'cash':
        return <DollarSign className="h-4 w-4" />
      case 'bank_transfer':
        return <Building2 className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#234D65]" />
            {title}
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">{description}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations du membre (si contrat de groupe) */}
          {isGroupContract && groupMemberName && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Paiement pour : {groupMemberName}
                </span>
              </div>
            </div>
          )}

          {/* Informations de paiement */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Informations de paiement
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Montant */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                  Montant du versement *
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="pl-10"
                    placeholder="100000"
                    min="0"
                    step="100"
                    required
                  />
                </div>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-medium text-gray-700">
                  Date de paiement *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="date"
                    type="date"
                    value={formData.date || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Heure */}
              <div className="space-y-2">
                <Label htmlFor="time" className="text-sm font-medium text-gray-700">
                  Heure de paiement *
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="time"
                    type="time"
                    value={formData.time || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Mode de paiement */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Mode de paiement *
                </Label>
                <Select
                  value={formData.mode || 'airtel_money'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, mode: value as PaymentMode }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="airtel_money">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Airtel Money
                      </div>
                    </SelectItem>
                    <SelectItem value="mobicash">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        Mobicash
                      </div>
                    </SelectItem>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Espèce
                      </div>
                    </SelectItem>
                    <SelectItem value="bank_transfer">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Virement bancaire
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Preuve de paiement */}
          <div className="space-y-2">
            <Label htmlFor="proof" className="text-sm font-medium text-gray-700">
              Preuve de paiement *
            </Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                id="proof"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={isCompressing}
              />
              <label htmlFor="proof" className="cursor-pointer">
                <div className="space-y-2">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {proofFile ? proofFile.name : 'Cliquez pour sélectionner une image'}
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, JPEG jusqu'à 10MB
                    </p>
                  </div>
                  {isCompressing && (
                    <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Compression en cours...
                    </div>
                  )}
                </div>
              </label>
            </div>
            {proofFile && (
              <div className="text-xs text-green-600 flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Fichier sélectionné : {(proofFile.size / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isCompressing || !formData.date || !formData.time || !formData.amount || !formData.mode || !proofFile}
              className="bg-[#234D65] hover:bg-[#1a3a4f]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Enregistrer le versement
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
