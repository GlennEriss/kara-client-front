import GabonPhoneInput from '@/components/shared/GabonPhoneInput'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import useStep1Form from '@/hooks/register/useStep1Form'
import { Plus } from 'lucide-react'
import React from 'react'

export default function ContactsIdentityForm() {
  const { form, mediator } = useStep1Form()
  const { watch } = form

  // Récupérer les valeurs actuelles des contacts
  const contacts = watch('identity.contacts') || []

  // S'assurer qu'il y a au moins un contact vide si le tableau est vide
  React.useEffect(() => {
    mediator.initializeContacts()
  }, [mediator])

  return (
    <div className="space-y-3 sm:space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-800 w-full min-w-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full">
        <FormLabel className="text-xs sm:text-sm font-medium text-[#224D62]">
          Numéros de téléphone <span className="text-red-500">*</span>
        </FormLabel>

        {mediator.canAddContact() && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => mediator.addContact()}
            className="border-[#CBB171] text-[#CBB171] hover:bg-[#CBB171]/10 transition-all duration-300 hover:scale-105 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        )}
      </div>

      <div className="space-y-2 sm:space-y-3 w-full">
        {contacts && contacts.length > 0 ? contacts.map((_, index) => (
          // Un FormField par contact : `field.value`/`field.onChange` sont
          // réactifs (comme le champ WhatsApp), contrairement à un watch global
          // couplé au médiateur qui ne redéclenchait pas le rendu de l'input.
          <FormField
            key={`contact-${index}`}
            name={`identity.contacts.${index}`}
            render={({ field, fieldState }) => (
              <FormItem className="animate-in slide-in-from-left-4 duration-300 w-full min-w-0">
                <FormControl>
                  <GabonPhoneInput
                    value={(field.value as string) ?? ''}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    canRemove={mediator.canRemoveContact()}
                    onRemove={() => mediator.removeContact(index)}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )) : (
          <div className="text-center text-gray-500 py-4">
            Aucun contact disponible
          </div>
        )}
      </div>
    </div>
  )
}
