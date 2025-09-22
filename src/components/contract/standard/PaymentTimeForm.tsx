import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

export default function PaymentTimeForm() {
  return (
    <FormField
      name="paymentTime"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Heure de paiement *</FormLabel>
          <FormControl>
            <Input
              type="time"
              {...field}
              className="w-full rounded-xl border p-2 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#234D65]"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
