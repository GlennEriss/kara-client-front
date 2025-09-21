import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

export default function PaymentDateForm() {
  return (
    <FormField
      name="paymentDate"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Date de paiement *</FormLabel>
          <FormControl>
            <Input
              type="date"
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
