import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

const PAYMENT_MODE_OPTIONS = [
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'mobicash', label: 'Mobicash' },
  { value: 'cash', label: 'Espèce' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
]

export default function PaymentModeForm() {
  return (
    <FormField
      name="paymentMode"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Mode de paiement *</FormLabel>
          <FormControl>
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              className="space-y-2"
            >
              {PAYMENT_MODE_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={option.value} 
                    id={option.value}
                    className="accent-[#234D65]"
                  />
                  <Label 
                    htmlFor={option.value}
                    className="text-sm text-slate-700 cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
