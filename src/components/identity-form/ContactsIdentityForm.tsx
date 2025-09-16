import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Phone, Plus, Trash2, CheckCircle } from 'lucide-react'
import useStep1Form from '@/hooks/register/useStep1Form'

export default function ContactsIdentityForm() {
  const { form, mediator } = useStep1Form()
  const { register, watch } = form

  // Récupérer les valeurs actuelles des contacts
  const contacts = watch('contacts') || []

  return (
    <div className="space-y-3 sm:space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-800 w-full min-w-0">
      <FormField
        name="contacts"
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
                {contacts.map((contact, index) => (
                  <div 
                    key={`contact-${index}`} 
                    className="space-y-2 animate-in slide-in-from-left-4 duration-300 w-full min-w-0" 
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex space-x-2 w-full min-w-0">
                      <div className="flex-1 relative min-w-0">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                        <Input
                          {...register(`contacts.${index}`)}
                          type="tel"
                          placeholder={`Téléphone ${index + 1}`}
                          onChange={(e) => {
                            mediator.updateContact(index, e.target.value)
                          }}
                          className={cn(
                            "pl-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                            fieldState.error && "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50",
                            contacts[index] && !fieldState.error && "border-[#CBB171] bg-[#CBB171]/5"
                          )}
                        />
                        {contacts[index] && !fieldState.error && (
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
                ))}
              </div>
            </FormControl>

            <FormMessage className="animate-in slide-in-from-bottom-2 duration-300 break-words text-xs" />
          </FormItem>
        )}
      />
    </div>
  )
}
