'use client'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { RegisterFormData } from '@/schemas/schemas'
import { UseFormReturn } from 'react-hook-form'
import SelectApp from '../forms/SelectApp'

interface ArrondissementAddressFormProps {
  form: UseFormReturn<RegisterFormData>
}

// Génération des options d'arrondissement (1 à 8)
const ARRONDISSEMENT_OPTIONS = Array.from({ length: 8 }, (_, i) => {
  const num = i + 1
  let suffix = 'ème'
  if (num === 1) suffix = 'er'
  return {
    value: `${num}${suffix} Arrondissement`,
    label: `${num}${suffix} Arrondissement`
  }
})

export default function ArrondissementAddressForm({ form }: ArrondissementAddressFormProps) {
  return (
    <FormField
      control={form.control}
      name="address.arrondissement"
      render={({ field, fieldState }) => {
        console.log('🏢 ArrondissementAddressForm - field.value:', field.value)
        return (
          <FormItem className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 w-full min-w-0">
            <FormLabel className="text-xs sm:text-sm font-medium text-[#224D62]">
              Arrondissement <span className="text-red-500">*</span>
            </FormLabel>
            <FormControl>
              <SelectApp
                options={ARRONDISSEMENT_OPTIONS}
                value={field.value || ''}
                onChange={field.onChange}
                placeholder="Sélectionnez un arrondissement..."
                className={cn(
                  fieldState.error && "border-red-300 focus:border-red-500 bg-red-50/50"
                )}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
