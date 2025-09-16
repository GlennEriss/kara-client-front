import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { SelectCountry } from '@/components/ui/select-country'

export default function NationalityIdentityForm() {
  return (
    <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-950 w-full min-w-0">
      <FormField
        name="nationality"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel className="text-xs sm:text-sm font-medium text-[#224D62]">
              Nationalité <span className="text-red-500">*</span>
            </FormLabel>
            
            <FormControl>
              <SelectCountry
                value={field.value}
                onValueChange={field.onChange}
                error={fieldState.error?.message}
                showValidation={!!field.value}
                placeholder="Sélectionner nationalité"
                defaultValue="GA"
              />
            </FormControl>
            
            <FormMessage className="animate-in slide-in-from-right-2 duration-300 break-words text-xs" />
          </FormItem>
        )}
      />
    </div>
  )
}
