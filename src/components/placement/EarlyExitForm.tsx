'use client'

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Calculator, Info } from 'lucide-react'
import { useCalculateEarlyExit, usePlacementMutations, usePlacement } from '@/hooks/usePlacements'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

type EarlyExitFormData = {
  commissionDue: number
  payoutAmount: number
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
  
  const form = useForm<EarlyExitFormData>({
    defaultValues: {
      commissionDue: 0,
      payoutAmount: 0,
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
    if (!user?.uid) return
    try {
      await requestEarlyExit.mutateAsync({
        placementId,
        commissionDue: values.commissionDue,
        payoutAmount: values.payoutAmount,
        adminId: user.uid,
      })
      form.reset()
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

