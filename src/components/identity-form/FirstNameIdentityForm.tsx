import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import InputApp from '@/components/forms/InputApp'
import { CheckCircle } from 'lucide-react'

export default function FirstNameIdentityForm() {
  return (
    <div className="space-y-3 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-100 w-full min-w-0">
      <FormField
        name="identity.firstName"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel className="text-sm font-bold text-[#224D62]">
              Prénom (optionnel)
            </FormLabel>
            
            <FormControl>
              <div className="relative">
                <InputApp
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Votre prénom"
                />
                {field.value && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#CBB171] animate-in zoom-in-50 duration-200" />
                )}
              </div>
            </FormControl>
            
            <FormMessage className="animate-in slide-in-from-right-2 duration-300 break-words font-medium" />
          </FormItem>
        )}
      />
    </div>
  )
}
