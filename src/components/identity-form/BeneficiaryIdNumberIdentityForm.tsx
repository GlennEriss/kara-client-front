import InputApp from '@/components/forms/InputApp'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

export default function BeneficiaryIdNumberIdentityForm() {
  return (
    <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 w-full min-w-0">
      <FormField
        name="identity.beneficiary.idNumber"
        render={({ field }) => (
          <FormItem>
            {/* Facultatif : tous n'ont pas de CNI au moment de l'adhésion. */}
            <FormLabel className="text-xs sm:text-sm font-medium text-[#224D62]">
              N° CNI de l&apos;ayant-droit
            </FormLabel>

            <FormControl>
              <InputApp
                value={field.value}
                onChange={field.onChange}
                placeholder="Ex : 1234567890"
              />
            </FormControl>

            <FormMessage className="animate-in slide-in-from-left-2 duration-300 break-words text-xs" />
          </FormItem>
        )}
      />
    </div>
  )
}
