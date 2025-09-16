import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import InputApp from '@/components/forms/InputApp'
import { CheckCircle } from 'lucide-react'

export default function LastNameIdentityForm() {
  return (
    <div className="space-y-3 animate-in fade-in-0 slide-in-from-left-4 duration-700 w-full min-w-0">
      <FormField
        name="identity.lastName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-bold text-[#224D62]">
              Nom <span className="text-red-500">*</span>
            </FormLabel>
            
            <FormControl>
              <div className="relative">
                <InputApp
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Votre nom de famille"
                />
                {field.value && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200" />
                )}
              </div>
            </FormControl>
            
            <FormMessage className="animate-in slide-in-from-left-2 duration-300 break-words font-medium" />
          </FormItem>
        )}
      />
    </div>
  )
}
