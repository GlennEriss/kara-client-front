import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import SelectRadioApp from '@/components/forms/SelectRadioApp'
import { CheckCircle } from 'lucide-react'

const CAR_OPTIONS = [
  { value: 'true', label: 'Oui' },
  { value: 'false', label: 'Non' }
]

export default function HasCarIdentityForm() {
  return (
    <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-1150 w-full min-w-0">
      <FormField
        name="hasCar"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs sm:text-sm font-medium text-[#224D62]">
              Possédez-vous une voiture ? <span className="text-red-500">*</span>
            </FormLabel>
            
            <FormControl>
              <SelectRadioApp
                options={CAR_OPTIONS}
                value={field.value?.toString() || ''}
                onChange={(value) => field.onChange(value === 'true')}
                name="hasCar"
              />
            </FormControl>
            
            {(field.value === true || field.value === false) && (
              <div className="flex items-center space-x-1 text-[#CBB171] text-xs animate-in slide-in-from-right-2 duration-300">
                <CheckCircle className="w-3 h-3" />
                <span>Réponse enregistrée: {field.value ? 'Oui' : 'Non'}</span>
              </div>
            )}
            
            <FormMessage className="animate-in slide-in-from-right-2 duration-300 break-words text-xs" />
          </FormItem>
        )}
      />
    </div>
  )
}
