import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import InputApp from '@/components/forms/InputApp'
import { FileText, CheckCircle } from 'lucide-react'

export default function BirthCertificateNumberIdentityForm() {
  return (
    <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-500 w-full min-w-0">
      <FormField
        name="identity.birthCertificateNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs sm:text-sm font-medium text-[#224D62]">
              Numéro d'acte de naissance <span className="text-red-500">*</span>
            </FormLabel>
            
            <FormControl>
              <div className="relative">
                <InputApp
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Numéro de l'acte"
                  icon={FileText}
                />
                {field.value && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200" />
                )}
              </div>
            </FormControl>
            
            <FormMessage className="animate-in slide-in-from-right-2 duration-300 break-words text-xs" />
          </FormItem>
        )}
      />
    </div>
  )
}
