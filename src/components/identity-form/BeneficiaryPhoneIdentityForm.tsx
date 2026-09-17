import GabonPhoneInput from '@/components/shared/GabonPhoneInput'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import useStep1Form from '@/hooks/register/useStep1Form'

export default function BeneficiaryPhoneIdentityForm() {
  const { mediator } = useStep1Form()

  return (
    <div className="w-full max-w-md">
      <div className="space-y-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 w-full min-w-0">
        <FormField
          name="identity.beneficiary.phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs sm:text-sm font-medium text-[#224D62]">
                Téléphone de l&apos;ayant-droit <span className="text-red-500">*</span>
              </FormLabel>

              <FormControl>
                <GabonPhoneInput
                  value={field.value ?? ''}
                  onChange={(value) => mediator.updateBeneficiaryPhone(value)}
                />
              </FormControl>

              <FormMessage className="animate-in slide-in-from-left-2 duration-300 break-words text-xs" />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
