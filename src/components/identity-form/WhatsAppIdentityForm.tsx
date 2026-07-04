import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import GabonPhoneInput from '@/components/shared/GabonPhoneInput'

/**
 * Champ « Numéro WhatsApp » de l'étape 1 (identité). Obligatoire, au même titre
 * que sur le formulaire d'adhésion membre. Utilise GabonPhoneInput (indicatif
 * +241 fixe, détection d'opérateur, validation) et émet la valeur au format
 * `+241XXXXXXXX` attendu par le schéma.
 */
export default function WhatsAppIdentityForm() {
  return (
    <div className="space-y-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-800 w-full min-w-0">
      <FormField
        name="identity.whatsappNumber"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel className="text-xs sm:text-sm font-medium text-[#224D62]">
              Numéro WhatsApp <span className="text-red-500">*</span>
            </FormLabel>
            <FormControl>
              <GabonPhoneInput
                value={(field.value as string) ?? ''}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  )
}
