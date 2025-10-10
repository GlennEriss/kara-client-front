import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import InputApp from '@/components/forms/InputApp'
import { Phone, CheckCircle } from 'lucide-react'
import useStep1Form from '@/hooks/register/useStep1Form'

export default function SpousePhoneIdentityForm() {
  const { mediator } = useStep1Form()

  return (
    <div className="w-full max-w-md">
      <div className="space-y-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-1400 w-full min-w-0">
        <FormField
          name="identity.spousePhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs sm:text-sm font-medium text-[#224D62]">
                Téléphone du conjoint(e) <span className="text-red-500">*</span>
              </FormLabel>
              
              <FormControl>
                <div className="relative">
                  <InputApp
                    value={field.value}
                    onChange={(value) => {
                      mediator.updateSpousePhone(value)
                    }}
                    placeholder="Ex: +24165671734"
                    icon={Phone}
                    type="tel"
                  />
                  {field.value && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200" />
                  )}
                </div>
              </FormControl>
              
              <div className="text-xs text-gray-600 mt-1">
                Format gabonais: +241 + 8 chiffres (Libertis: 62/66, Moov: 65, Airtel: 74/77)
              </div>
              
              <FormMessage className="animate-in slide-in-from-left-2 duration-300 break-words text-xs" />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
