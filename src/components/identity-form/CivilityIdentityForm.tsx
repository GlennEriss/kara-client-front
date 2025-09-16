import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import SelectRadioApp, { RadioOption } from '@/components/forms/SelectRadioApp'
import { CIVILITY_OPTIONS } from '@/components/register/register.data'

export default function CivilityIdentityForm() {
  return (
    <div className="space-y-3 animate-in fade-in-0 slide-in-from-left-4 duration-600 w-full">
      <FormField
        name="identity.civility"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel className="text-sm font-bold text-[#224D62]">
              Civilité <span className="text-red-500">*</span>
            </FormLabel>
            
            <FormControl>
              <SelectRadioApp
                options={CIVILITY_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                name={field.name}
              />
            </FormControl>
            
            <FormMessage className="animate-in slide-in-from-left-2 duration-300 break-words font-medium" />
          </FormItem>
        )}
      />
    </div>
  )
}
