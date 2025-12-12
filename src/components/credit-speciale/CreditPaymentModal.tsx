'use client'

import React, { useState } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Loader2,
  Calendar,
  Clock,
  DollarSign,
  Upload,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { CreditPaymentMode } from '@/types/types'
import { ImageCompressionService } from '@/services/imageCompressionService'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { creditPaymentFormSchema, type CreditPaymentFormInput } from '@/schemas/credit-speciale.schema'
import { useCreditPaymentMutations } from '@/hooks/useCreditSpeciale'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'

interface CreditPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  creditId: string
  defaultAmount?: number
  onSuccess?: () => void
}

export default function CreditPaymentModal({
  isOpen,
  onClose,
  creditId,
  defaultAmount,
  onSuccess,
}: CreditPaymentModalProps) {
  const [proofFile, setProofFile] = useState<File | undefined>()
  const [isCompressing, setIsCompressing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { user } = useAuth()
  const { create: createPayment } = useCreditPaymentMutations()

  const form = useForm<CreditPaymentFormInput>({
    resolver: zodResolver(creditPaymentFormSchema),
    defaultValues: {
      creditId,
      amount: defaultAmount || 0,
      paymentDate: new Date(),
      paymentTime: format(new Date(), 'HH:mm'),
      mode: 'CASH',
      comment: '',
    },
  })

  React.useEffect(() => {
    if (defaultAmount) {
      form.setValue('amount', defaultAmount)
    }
  }, [defaultAmount, form])

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
    if (!proofFile) {
      toast.error('Veuillez téléverser une preuve de paiement')
      return
    }

    if (!user?.uid) {
      toast.error('Vous devez être connecté pour enregistrer un paiement')
      return
    }

    try {
      setIsSubmitting(true)
      
      await createPayment.mutateAsync({
        data: {
          ...data,
          createdBy: user.uid,
        },
        proofFile,
      })

      form.reset()
      setProofFile(undefined)
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Erreur lors de l\'enregistrement du paiement:', error)
      toast.error(error?.message || 'Erreur lors de l\'enregistrement du paiement')
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
            Enregistrer un versement
          </DialogTitle>
          <DialogDescription>
            Enregistrez un nouveau versement pour ce crédit
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
              <Input
                id="payment-date"
                type="date"
                {...form.register('paymentDate', { valueAsDate: true })}
                required
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
                Montant (FCFA) *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="100"
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
                value={form.watch('mode')}
                onValueChange={(value) => form.setValue('mode', value as CreditPaymentMode)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un moyen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Espèces</SelectItem>
                  <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Virement bancaire</SelectItem>
                  <SelectItem value="CHEQUE">Chèque</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.mode && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.mode.message}
                </p>
              )}
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
              disabled={isCompressing}
              required
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

          {/* Commentaire */}
          <div>
            <Label htmlFor="comment" className="mb-2">Commentaire (optionnel)</Label>
            <Textarea
              id="comment"
              {...form.register('comment')}
              rows={3}
              placeholder="Ajoutez un commentaire si nécessaire..."
            />
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
              disabled={isSubmitting || isCompressing || !proofFile}
              className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer le versement'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

