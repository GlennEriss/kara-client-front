import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import SelectRadioApp, { RadioOption } from '@/components/forms/SelectRadioApp'
import { CIVILITY_OPTIONS } from '@/components/register/register.data'
import { IdentityFormMediatorFactory } from '@/factories/IdentityFormMediatorFactory'
import { useFormContext } from 'react-hook-form'
import { RegisterFormData } from '@/schemas/schemas'

export default function CivilityIdentityForm() {
  const form = useFormContext<RegisterFormData>()
  const mediator = IdentityFormMediatorFactory.create(form)

  const handleCivilityChange = (value: string) => {
    // Mettre à jour la civilité
    form.setValue('identity.civility', value)
    
    // Mettre à jour automatiquement le genre basé sur la civilité
    mediator.updateGenderFromCivility(value)
  }

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
                onChange={handleCivilityChange}
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
