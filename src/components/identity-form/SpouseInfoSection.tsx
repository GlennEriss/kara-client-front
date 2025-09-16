import React from 'react'
import { Label } from '@/components/ui/label'
import { User } from 'lucide-react'
import SpouseLastNameIdentityForm from '@/components/identity-form/SpouseLastNameIdentityForm'
import SpouseFirstNameIdentityForm from '@/components/identity-form/SpouseFirstNameIdentityForm'
import SpousePhoneIdentityForm from '@/components/identity-form/SpousePhoneIdentityForm'
import useStep1Form from '@/hooks/register/useStep1Form'

export default function SpouseInfoSection() {
  const { form } = useStep1Form()
  const { watch, setValue, clearErrors } = form

  // Vérifier si la situation matrimoniale nécessite des infos conjoint
  const maritalStatus = watch('maritalStatus')
  const requiresSpouseInfo = ['Marié(e)', 'Concubinage'].includes(maritalStatus)

  // Nettoyer les champs du conjoint si la situation matrimoniale ne le nécessite pas
  React.useEffect(() => {
    if (!requiresSpouseInfo) {
      setValue('spouseLastName', '')
      setValue('spouseFirstName', '')
      setValue('spousePhone', '')
      // Nettoyer aussi les erreurs éventuelles
      clearErrors(['spouseLastName', 'spouseFirstName', 'spousePhone'])
    }
  }, [requiresSpouseInfo, setValue, clearErrors])

  // Nettoyer automatiquement les erreurs quand les champs sont corrigés
  React.useEffect(() => {
    const subscription = watch((value: any) => {
      // Nettoyer les erreurs du conjoint si nécessaire
      if (requiresSpouseInfo) {
        if (value.spouseLastName && value.spouseLastName.trim().length >= 2 && form.formState.errors.spouseLastName) {
          clearErrors('spouseLastName')
        }
        if (value.spouseFirstName && value.spouseFirstName.trim().length >= 2 && form.formState.errors.spouseFirstName) {
          clearErrors('spouseFirstName')
        }
        if (value.spousePhone && value.spousePhone.trim().length >= 8 && form.formState.errors.spousePhone) {
          clearErrors('spousePhone')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [watch, clearErrors, form.formState.errors, requiresSpouseInfo])

  if (!requiresSpouseInfo) {
    return null
  }

  return (
    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 w-full">
      {/* Header pour les infos conjoint */}
      <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#CBB171]/10 to-[#224D62]/10 rounded-lg border border-[#CBB171]/30">
        <User className="w-5 h-5 text-[#224D62]" />
        <Label className="text-sm font-bold text-[#224D62]">
          Informations du conjoint <span className="text-red-500">*</span>
        </Label>
      </div>

      {/* Nom et Prénom du conjoint */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
        <SpouseLastNameIdentityForm />
        <SpouseFirstNameIdentityForm />
      </div>

      {/* Téléphone du conjoint */}
      <SpousePhoneIdentityForm />
    </div>
  )
}
