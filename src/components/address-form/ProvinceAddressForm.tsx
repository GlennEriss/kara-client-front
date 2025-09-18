'use client'

import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import InputApp from '../forms/InputApp'
import { UseFormReturn } from 'react-hook-form'
import { RegisterFormData } from '@/schemas/schemas'

interface ProvinceAddressFormProps {
  form: UseFormReturn<RegisterFormData>
}

export default function ProvinceAddressForm({ form }: ProvinceAddressFormProps) {
  // Surveiller les changements pour forcer le re-render
  const provinceValue = form.watch('address.province')

  return (
    <FormField
      control={form.control}
      name="address.province"
      key={provinceValue} // Force le re-render quand la valeur change
      render={({ field, fieldState }) => {
        console.log('🗺️ ProvinceAddressForm - field.value:', field.value)
        return (
        <FormItem className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 w-full min-w-0">
          <FormLabel className="text-xs sm:text-sm font-medium text-[#224D62]">
            Province <span className="text-red-500">*</span>
          </FormLabel>
          <FormControl>
            <InputApp
              icon={MapPin}
              placeholder="Ex: Estuaire, Haut-Ogooué..."
              value={provinceValue || ''}
              onChange={field.onChange}
              disabled
              className={cn(
                fieldState.error && "border-red-300 focus:border-red-500 bg-red-50/50"
              )}
            />
          </FormControl>
          <div className="flex items-center space-x-2 text-gray-500 text-xs animate-in slide-in-from-right-2 duration-300 break-words">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span>
              Rempli automatiquement lors de la sélection du quartier
            </span>
          </div>
          <FormMessage />
        </FormItem>
        )
      }}
    />
  )
}
