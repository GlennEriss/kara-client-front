import InputApp from '@/components/forms/InputApp'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { CheckCircle } from 'lucide-react'

export default function BeneficiaryFirstNameIdentityForm() {
  return (
    <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 w-full min-w-0">
      <FormField
        name="identity.beneficiary.firstName"
        render={({ field }) => (
          <FormItem>
            {/* Facultatif : tous les ayants-droit ne sont pas identifiés par un prénom
                au moment de l'adhésion (cf. beneficiarySchema). */}
            <FormLabel className="text-xs sm:text-sm font-medium text-[#224D62]">
              Prénom de l&apos;ayant-droit
            </FormLabel>

            <FormControl>
              <div className="relative">
                <InputApp
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Prénom"
                />
                {field.value && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200" />
                )}
              </div>
            </FormControl>

            <FormMessage className="animate-in slide-in-from-left-2 duration-300 break-words text-xs" />
          </FormItem>
        )}
      />
    </div>
  )
}
