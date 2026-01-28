/**
 * Étape 2 : Sélection du forfait + Fréquence de paiement
 */

'use client'

import { UseFormReturn } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSubscriptionsCICache } from '../../../hooks/useSubscriptionsCICache'
import { Skeleton } from '@/components/ui/skeleton'
import type { CaisseImprevueDemandFormInput } from '../../../hooks/useDemandForm'

interface Step2ForfaitProps {
  form: UseFormReturn<CaisseImprevueDemandFormInput>
}

export function Step2Forfait({ form }: Step2ForfaitProps) {
  const { data: subscriptions, isLoading } = useSubscriptionsCICache()

  const selectedSubscription = subscriptions?.find(
    (sub) => sub.id === form.watch('subscriptionCIID')
  )

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="subscription">
          Forfait <span className="text-red-500">*</span>
        </Label>
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={form.watch('subscriptionCIID')}
            onValueChange={(value) => {
              const sub = subscriptions?.find((s) => s.id === value)
              if (sub) {
                form.setValue('subscriptionCIID', sub.id)
                form.setValue('subscriptionCICode', sub.code)
                form.setValue('subscriptionCILabel', sub.label)
                form.setValue('subscriptionCIAmountPerMonth', sub.amountPerMonth)
                form.setValue('subscriptionCINominal', sub.nominal)
                form.setValue('subscriptionCIDuration', sub.durationInMonths)
                form.setValue('subscriptionCISupportMin', sub.supportMin)
                form.setValue('subscriptionCISupportMax', sub.supportMax)
              }
            }}
          >
            <SelectTrigger id="subscription">
              <SelectValue placeholder="Sélectionner un forfait" />
            </SelectTrigger>
            <SelectContent>
              {subscriptions?.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>
                  {sub.label || sub.code} - {sub.amountPerMonth.toLocaleString('fr-FR')} FCFA/mois
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedSubscription && (
        <div className="bg-kara-primary/5 p-4 rounded-lg space-y-2 text-sm">
          <p>
            <span className="font-medium">Montant :</span>{' '}
            {selectedSubscription.amountPerMonth.toLocaleString('fr-FR')} FCFA/mois
          </p>
          <p>
            <span className="font-medium">Durée :</span> {selectedSubscription.durationInMonths} mois
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="paymentFrequency">
          Fréquence de paiement <span className="text-red-500">*</span>
        </Label>
        <Select
          value={form.watch('paymentFrequency')}
          onValueChange={(value) => form.setValue('paymentFrequency', value as 'DAILY' | 'MONTHLY')}
        >
          <SelectTrigger id="paymentFrequency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MONTHLY">Mensuel</SelectItem>
            <SelectItem value="DAILY">Quotidien</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="desiredStartDate">
          Date souhaitée de début <span className="text-red-500">*</span>
        </Label>
        <Input
          id="desiredStartDate"
          type="date"
          {...form.register('desiredStartDate', { required: 'La date est requise' })}
          min={new Date().toISOString().split('T')[0]}
        />
      </div>
    </div>
  )
}
