/**
 * Hook pour gérer le formulaire multi-étapes de création de demande Caisse Spéciale V2
 * 3 étapes : Membre, Infos demande, Contact d'urgence
 */

import { useForm, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import {
  caisseSpecialeDemandFormSchema,
  caisseSpecialeDemandDefaultValues,
  type CaisseSpecialeDemandFormInput,
} from '@/schemas/caisse-speciale.schema'
import { useCaisseSpecialeDemandFormPersistence } from './useCaisseSpecialeDemandFormPersistence'

const defaultValues: Partial<CaisseSpecialeDemandFormInput> = {
  ...caisseSpecialeDemandDefaultValues,
  memberId: '',
}

export function useCaisseSpecialeDemandForm(initialValues?: Partial<CaisseSpecialeDemandFormInput>) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const mergedDefaultValues = {
    ...defaultValues,
    ...initialValues,
    emergencyContact: {
      ...defaultValues.emergencyContact,
      ...(initialValues?.emergencyContact || {}),
    },
  } as CaisseSpecialeDemandFormInput

  const form = useForm<CaisseSpecialeDemandFormInput>({
    resolver: zodResolver(caisseSpecialeDemandFormSchema),
    mode: 'onChange',
    defaultValues: mergedDefaultValues,
  })

  const { clearFormData } = useCaisseSpecialeDemandFormPersistence(form)

  const resetForm = () => {
    form.reset(defaultValues as CaisseSpecialeDemandFormInput)
    clearFormData()
    setCurrentStep(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetCurrentStep = () => {
    const fieldsToReset = getFieldsForStep(currentStep)
    fieldsToReset.forEach((field) => {
      const defaultValue = getDefaultValueForField(field)
      form.setValue(field as any, defaultValue as any)
    })
  }

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep)

    if (currentStep === 3) return

    const isValid = await form.trigger(fieldsToValidate as any)

    if (isValid && currentStep < 3) {
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const goToStep = (step: number) => {
    if (step >= 1 && step <= 3) {
      setCurrentStep(step)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return {
    form,
    currentStep,
    setCurrentStep,
    nextStep,
    previousStep,
    goToStep,
    isSubmitting,
    setIsSubmitting,
    resetForm,
    resetCurrentStep,
    clearFormData,
  }
}

function getFieldsForStep(step: number): (keyof CaisseSpecialeDemandFormInput)[] {
  switch (step) {
    case 1:
      return ['memberId']
    case 2:
      return ['caisseType', 'monthlyAmount', 'monthsPlanned', 'desiredDate']
    case 3:
      return [
        'emergencyContact.lastName',
        'emergencyContact.phone1',
        'emergencyContact.relationship',
        'emergencyContact.idNumber',
        'emergencyContact.typeId',
        'emergencyContact.documentPhotoUrl',
      ] as any
    default:
      return []
  }
}

function getDefaultValueForField(field: string): any {
  const fieldPath = field.split('.')

  if (fieldPath[0] === 'emergencyContact') {
    return ''
  }

  switch (field) {
    case 'memberId':
      return ''
    case 'monthlyAmount':
      return 0
    case 'monthsPlanned':
      return 12
    case 'caisseType':
      return 'STANDARD'
    case 'desiredDate':
      return new Date().toISOString().split('T')[0]
    default:
      return ''
  }
}
