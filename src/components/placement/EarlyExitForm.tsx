'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Calculator, Info, FileText, X } from 'lucide-react'
import { useCalculateEarlyExit, usePlacementMutations, usePlacement } from '@/hooks/usePlacements'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

type EarlyExitFormData = {
  commissionDue: number
  payoutAmount: number
  reason: string
  documentPdf: FileList | null
}

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
    
    try {
      await requestEarlyExit.mutateAsync({
        placementId,
        commissionDue: values.commissionDue,
        payoutAmount: values.payoutAmount,
        reason: values.reason.trim(),
        documentPdf: selectedFile,
        benefactorId: placement.benefactorId,
        adminId: user.uid,
      })
      form.reset({
        commissionDue: 0,
        payoutAmount: 0,
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

