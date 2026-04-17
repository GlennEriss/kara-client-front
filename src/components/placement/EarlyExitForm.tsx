'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useCalculateEarlyExit, usePlacement, usePlacementMutations } from '@/hooks/usePlacements'
import type { PaymentMode } from '@/types/types'
import { Calculator, Calendar, FileText, Info, Loader2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

type EarlyExitFormData = {
  commissionDue: number
  payoutAmount: number
  paymentMode: PaymentMode
  withFees?: boolean
  paymentMethodOther?: string
  paymentDate: string
  reason: string
  documentPdf: FileList | null
}

const PAYMENT_MODE_OPTIONS: Array<{ value: PaymentMode; label: string }> = [
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'mobicash', label: 'Mobicash' },
  { value: 'cash', label: 'Espèce' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
  { value: 'other', label: 'Autres moyens' },
]

interface EarlyExitFormProps {
  placementId: string
  onClose: () => void
}

export default function EarlyExitForm({ placementId, onClose }: EarlyExitFormProps) {
  const { user } = useAuth()
  const { data: placement } = usePlacement(placementId)
  const { data: calculatedAmounts, isLoading: isCalculating } = useCalculateEarlyExit(placementId)
  const { requestEarlyExit } = usePlacementMutations()
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  
  const form = useForm<EarlyExitFormData>({
    defaultValues: {
      commissionDue: 0,
      payoutAmount: 0,
      paymentMode: 'cash',
      withFees: undefined,
      paymentMethodOther: '',
      paymentDate: new Date().toISOString().slice(0, 10),
      reason: '',
      documentPdf: null,
    },
  })

  // Pré-remplir avec les valeurs calculées
  useEffect(() => {
    if (calculatedAmounts) {
      form.setValue('commissionDue', calculatedAmounts.commissionDue)
      form.setValue('payoutAmount', calculatedAmounts.payoutAmount)
    }
  }, [calculatedAmounts, form])

  const onSubmit = async (values: EarlyExitFormData) => {
    if (!user?.uid || !placement) return

    const isMobileMoney = values.paymentMode === 'airtel_money' || values.paymentMode === 'mobicash'
    
    // Valider que le motif est fourni
    if (!values.reason || values.reason.trim().length < 10) {
      toast.error('Le motif du retrait anticipé est requis (minimum 10 caractères)')
      return
    }
    
    // Valider que le document PDF est fourni
    if (!selectedFile) {
      toast.error('Le document PDF de retrait anticipé signé est requis')
      return
    }

    if (!values.paymentDate) {
      toast.error('La date du versement est requise')
      return
    }

    if (isMobileMoney && !(values.withFees === true || values.withFees === false)) {
      toast.error('Veuillez indiquer si le versement est avec frais ou sans frais')
      return
    }

    if (values.paymentMode === 'other' && !values.paymentMethodOther?.trim()) {
      toast.error('Veuillez préciser le moyen de paiement utilisé')
      return
    }
    
    try {
      await requestEarlyExit.mutateAsync({
        placementId,
        commissionDue: values.commissionDue,
        payoutAmount: values.payoutAmount,
        paymentMode: values.paymentMode,
        withFees: isMobileMoney ? values.withFees : undefined,
        paymentMethodOther: values.paymentMode === 'other' ? values.paymentMethodOther?.trim() : undefined,
        paymentDate: new Date(`${values.paymentDate}T00:00:00`),
        reason: values.reason.trim(),
        documentPdf: selectedFile,
        benefactorId: placement.benefactorId,
        adminId: user.uid,
      })
      form.reset({
        commissionDue: 0,
        payoutAmount: 0,
        paymentMode: 'cash',
        withFees: undefined,
        paymentMethodOther: '',
        paymentDate: new Date().toISOString().slice(0, 10),
        reason: '',
        documentPdf: null,
      })
      setSelectedFile(null)
      setFileInputKey(prev => prev + 1)
      onClose()
    } catch (e) {
      // handled by react-query
    }
  }

  const handleRecalculate = async () => {
    if (!user?.uid) return
    try {
      const { ServiceFactory } = await import('@/factories/ServiceFactory')
      const service = ServiceFactory.getPlacementService()
      const amounts = await service.calculateEarlyExitAmounts(placementId)
      form.setValue('commissionDue', amounts.commissionDue)
      form.setValue('payoutAmount', amounts.payoutAmount)
      toast.success('Montants recalculés')
    } catch (error: any) {
      toast.error(`Erreur lors du calcul: ${error.message}`)
    }
  }

  const selectedPaymentMode = form.watch('paymentMode')
  const isMobileMoney = selectedPaymentMode === 'airtel_money' || selectedPaymentMode === 'mobicash'

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {isCalculating ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#234D65]" />
            <span className="ml-2 text-gray-600">Calcul des montants...</span>
          </div>
        ) : (
          <>
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 text-sm">
                <strong>Règle de calcul :</strong> Si au moins 1 mois s'est écoulé depuis le début du placement, 
                la commission d'un mois est due. Sinon, aucune commission n'est due.
              </AlertDescription>
            </Alert>

            <FormField
              control={form.control}
              name="commissionDue"
              rules={{ required: 'Commission due requise', min: { value: 0, message: 'Doit être positif' } }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-[#234D65]" />
                    Commission due (FCFA)
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={0} 
                      step="0.01" 
                      {...field}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0
                        field.onChange(value)
                        // Recalculer le montant à verser : capital + commission due
                        if (placement) {
                          const newPayoutAmount = placement.amount + value
                          form.setValue('payoutAmount', newPayoutAmount)
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payoutAmount"
              rules={{ required: 'Montant à verser requis', min: { value: 0, message: 'Doit être positif' } }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant à verser (capital + commission due) (FCFA)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={0} 
                      step="0.01" 
                      {...field}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0
                        field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              rules={{ 
                required: 'Le motif du retrait anticipé est requis',
                minLength: { value: 10, message: 'Le motif doit contenir au moins 10 caractères' },
                maxLength: { value: 500, message: 'Le motif ne peut pas dépasser 500 caractères' }
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motif du retrait anticipé *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez la raison du retrait anticipé (minimum 10 caractères)"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentMode"
                rules={{ required: 'Le moyen de paiement est requis' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moyen de paiement *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value as PaymentMode)
                        if (value !== 'airtel_money' && value !== 'mobicash') {
                          form.setValue('withFees', undefined)
                        }
                        if (value !== 'other') {
                          form.setValue('paymentMethodOther', '')
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un moyen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_MODE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDate"
                rules={{ required: 'La date du versement est requise' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#234D65]" />
                      Date du versement *
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isMobileMoney && (
              <FormField
                control={form.control}
                name="withFees"
                rules={{
                  validate: (value) =>
                    value === true || value === false || 'Veuillez sélectionner "Avec frais" ou "Sans frais"',
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frais *</FormLabel>
                    <FormControl>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="withFees"
                            checked={field.value === true}
                            onChange={() => field.onChange(true)}
                            className="rounded-full border-gray-300"
                          />
                          <span>Avec frais</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="withFees"
                            checked={field.value === false}
                            onChange={() => field.onChange(false)}
                            className="rounded-full border-gray-300"
                          />
                          <span>Sans frais</span>
                        </label>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedPaymentMode === 'other' && (
              <FormField
                control={form.control}
                name="paymentMethodOther"
                rules={{
                  validate: (value) =>
                    value?.trim() ? true : 'Veuillez saisir le nom du moyen utilisé',
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du moyen utilisé *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Chèque certifié, Wave, Orange Money..."
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="documentPdf"
              rules={{ 
                required: 'Le document PDF de retrait anticipé signé est requis',
                validate: (files) => {
                  if (!selectedFile) return 'Le document PDF est requis'
                  if (selectedFile.type !== 'application/pdf') return 'Le fichier doit être un PDF'
                  if (selectedFile.size > 10 * 1024 * 1024) return 'La taille du fichier ne peut pas dépasser 10MB'
                  return true
                }
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#234D65]" />
                    Document PDF de retrait anticipé signé *
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        key={fileInputKey}
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          setSelectedFile(file)
                          field.onChange(e.target.files)
                        }}
                      />
                      <p className="text-xs text-gray-500">
                        Téléversez le document PDF de retrait anticipé signé par le bienfaiteur. 
                        Ce document doit contenir la demande de retrait anticipé avec les signatures nécessaires. 
                        Format accepté : PDF uniquement, taille maximale : 10 MB.
                      </p>
                      {selectedFile && (
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                          <FileText className="h-4 w-4 text-gray-600" />
                          <span className="text-sm text-gray-700 flex-1">{selectedFile.name}</span>
                          <span className="text-xs text-gray-500">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setSelectedFile(null)
                              field.onChange(null)
                              setFileInputKey(prev => prev + 1)
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleRecalculate}
                className="flex-1"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Recalculer
              </Button>
            </div>
          </>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className="flex-1"
            disabled={requestEarlyExit.isPending || isCalculating}
          >
            Annuler
          </Button>
          <Button 
            type="submit" 
            disabled={requestEarlyExit.isPending || isCalculating || !user?.uid}
            className="flex-1 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#1a3a4d] hover:to-[#234D65] text-white"
          >
            {requestEarlyExit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmer le retrait
          </Button>
        </div>
      </form>
    </Form>
  )
}
