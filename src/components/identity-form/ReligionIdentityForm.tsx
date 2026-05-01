import SelectApp from '@/components/forms/SelectApp'
import { RELIGION_OPTIONS } from '@/components/register/register.data'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { CheckCircle } from 'lucide-react'
import { useFormContext } from 'react-hook-form'
import type { RegisterFormData } from '@/types/types'

export default function ReligionIdentityForm() {
  const { watch, setValue, getValues, formState: { errors } } = useFormContext<RegisterFormData>()
  const selectedReligion = watch('identity.religion')
  const isOtherReligion = selectedReligion === 'Autre'

  return (
    <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-700 w-full min-w-0">
      <FormField
        name="identity.religion"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs sm:text-sm font-medium text-[#224D62]">
              Religion <span className="text-red-500">*</span>
            </FormLabel>
            
            <FormControl>
              <div className="relative">
                <SelectApp
                  options={RELIGION_OPTIONS}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value)
                    if (value !== 'Autre') {
                      const currentIdentity = getValues('identity')
                      setValue(
                        'identity',
                        { ...(currentIdentity as any), customReligion: '' } as any,
                        { shouldValidate: true }
                      )
                    }
                  }}
                  placeholder="Sélectionner votre religion"
                  className={cn(
                    field.value && "border-[#CBB171] bg-[#CBB171]/5"
                  )}
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

      {isOtherReligion && (
        <div className="space-y-1">
          <FormLabel className="text-xs sm:text-sm font-medium text-[#224D62]">
            Précisez votre religion <span className="text-red-500">*</span>
          </FormLabel>
          <Input
            value={String((getValues('identity') as any)?.customReligion || '')}
            onChange={(e) => {
              const currentIdentity = getValues('identity')
              setValue(
                'identity',
                { ...(currentIdentity as any), customReligion: e.target.value } as any,
                { shouldValidate: true }
              )
            }}
            placeholder="Saisissez le nom exact de la religion"
            className={cn(
              "h-10",
              (errors.identity as any)?.customReligion && "border-red-300 focus-visible:ring-red-300"
            )}
          />
          {(errors.identity as any)?.customReligion && (
            <p className="text-xs text-red-500">{(errors.identity as any).customReligion.message}</p>
          )}
        </div>
      )}
    </div>
  )
}
