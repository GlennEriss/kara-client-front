'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { RegisterFormData } from '@/schemas/schemas'
import { Info, MapPin } from 'lucide-react'
import { UseFormReturn } from 'react-hook-form'
import InputApp from '../forms/InputApp'

interface ProvinceAddressFormProps {
  form: UseFormReturn<RegisterFormData>
}

export default function ProvinceAddressForm({ form }: ProvinceAddressFormProps) {
  return (
    <FormField
      control={form.control}
      name="address.province"
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
              value={field.value || ''}
              onChange={field.onChange}
              disabled
              className={cn(
                fieldState.error && "border-red-300 focus:border-red-500 bg-red-50/50"
              )}
            />
          </FormControl>
          <Alert className="border-[#CBB171]/30 bg-[#CBB171]/5">
            <Info className="h-4 w-4 text-[#CBB171]" />
            <AlertDescription className="text-xs text-[#224D62]/80">
              <strong>Remplissage automatique :</strong> Ce champ sera automatiquement rempli lors de la sélection d'un quartier dans la recherche.
            </AlertDescription>
          </Alert>
          <FormMessage />
        </FormItem>
        )
      }}
    />
  )
}
