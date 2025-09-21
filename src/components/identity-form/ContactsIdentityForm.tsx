import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import InputApp from '@/components/forms/InputApp'
import { Button } from '@/components/ui/button'
import { Phone, Plus, Trash2, CheckCircle } from 'lucide-react'
import useStep1Form from '@/hooks/register/useStep1Form'

export default function ContactsIdentityForm() {
  const { form, mediator } = useStep1Form()
  const { register, watch } = form

  // Récupérer les valeurs actuelles des contacts
  const contacts = watch('identity.contacts') || []
  
  // S'assurer qu'il y a au moins un contact vide si le tableau est vide
  React.useEffect(() => {
    mediator.initializeContacts()
  }, [mediator])

  return (
    <div className="space-y-3 sm:space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-800 w-full min-w-0">
      <FormField
        name="identity.contacts"
        render={({ field, fieldState }) => (
          <FormItem>
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

            <FormControl>
              <div className="space-y-2 sm:space-y-3 w-full">
                {contacts && contacts.length > 0 ? contacts.map((contact, index) => (
                  <div 
                    key={`contact-${index}`} 
                    className="space-y-2 animate-in slide-in-from-left-4 duration-300 w-full min-w-0" 
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex space-x-2 w-full min-w-0">
                      <div className="flex-1 relative min-w-0">
                        <InputApp
                          value={contact || ''}
                          onChange={(value) => {
                            mediator.updateContact(index, value)
                          }}
                          placeholder={`Ex: +24162671734 (Liberté/Airtel)`}
                          icon={Phone}
                          type="tel"
                        />
                        {contact && !fieldState.error && (
                          <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200" />
                        )}
                      </div>
                      
                      {mediator.canRemoveContact() && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => mediator.removeContact(index)}
                          className="border-red-300 text-red-500 hover:bg-red-50 transition-all duration-300 hover:scale-105"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-gray-500 py-4">
                    Aucun contact disponible
                  </div>
                )}
              </div>
            </FormControl>

            <div className="text-xs text-gray-600 mt-2">
              <strong>Opérateurs valides au Gabon :</strong>
              <br />• Liberté : +24162... ou +24166...
              <br />• Airtel : +24174... ou +24177...
            </div>
            
            <FormMessage className="animate-in slide-in-from-bottom-2 duration-300 break-words text-xs" />
          </FormItem>
        )}
      />
    </div>
  )
}
