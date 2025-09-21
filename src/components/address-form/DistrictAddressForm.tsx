'use client'

import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import InputApp from '../forms/InputApp'
import { UseFormReturn } from 'react-hook-form'
import { RegisterFormData } from '@/schemas/schemas'

interface DistrictAddressFormProps {
  form: UseFormReturn<RegisterFormData>
}

export default function DistrictAddressForm({ form }: DistrictAddressFormProps) {
  return (
    <FormField
      control={form.control}
      name="address.district"
      render={({ field, fieldState }) => {
        console.log('🏘️ DistrictAddressForm - field.value:', field.value)
        return (
          <FormItem className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 w-full min-w-0">
            <FormLabel className="text-xs sm:text-sm font-medium text-[#224D62]">
              Quartier <span className="text-red-500">*</span>
            </FormLabel>
            <FormControl>
              <InputApp
                icon={MapPin}
                placeholder="Ex: Glass, Akanda, Lalala..."
                value={field.value || ''}
                onChange={field.onChange}
                className={cn(
                  fieldState.error && "border-red-300 focus:border-red-500 bg-red-50/50"
                )}
              />
            </FormControl>
            <div className="flex items-center space-x-2 text-gray-500 text-xs animate-in slide-in-from-right-2 duration-300 break-words">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span>
                Sélectionnez d'abord un quartier dans la recherche. Vous pourrez ensuite corriger la syntaxe si nécessaire.
              </span>
            </div>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
