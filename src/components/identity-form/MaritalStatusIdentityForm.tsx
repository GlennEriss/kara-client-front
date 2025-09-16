import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import SelectApp from '@/components/forms/SelectApp'
import { MARITAL_STATUS_OPTIONS } from '@/components/register/register.data'

export default function MaritalStatusIdentityForm() {
  return (
    <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-1100 w-full min-w-0">
      <FormField
        name="maritalStatus"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs sm:text-sm font-medium text-[#224D62]">
              Situation matrimoniale <span className="text-red-500">*</span>
            </FormLabel>
            
            <FormControl>
              <SelectApp
                options={MARITAL_STATUS_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                placeholder="Sélectionner"
              />
            </FormControl>
            
            <FormMessage className="animate-in slide-in-from-left-2 duration-300 break-words text-xs" />
          </FormItem>
        )}
      />
    </div>
  )
}
