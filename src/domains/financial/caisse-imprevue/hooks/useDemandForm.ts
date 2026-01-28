/**
 * Hook pour gérer le formulaire multi-étapes de création de demande
 * 
 * Utilise react-hook-form avec validation Zod par étape
 */

import { useForm, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import type { CreateCaisseImprevueDemandInput } from '../entities/demand.types'
import { useDemandFormPersistence } from './useDemandFormPersistence'

// Schemas seront importés depuis schemas/
// Pour l'instant, on définit un type de base
export interface CaisseImprevueDemandFormInput {
  // Step 1
  memberId: string
  memberFirstName: string
  memberLastName: string
  memberEmail?: string
  memberContacts?: string[]
  memberMatricule: string
  memberPhone?: string
  cause: string

  // Step 2
  subscriptionCIID: string
  subscriptionCICode: string
  subscriptionCILabel?: string
  subscriptionCIAmountPerMonth: number
  subscriptionCINominal?: number
  subscriptionCIDuration: number
  subscriptionCISupportMin?: number
  subscriptionCISupportMax?: number
  paymentFrequency: 'DAILY' | 'MONTHLY'
  desiredStartDate: string

  // Step 3
  emergencyContact: {
    memberId?: string
    lastName: string
    firstName?: string
    phone1: string
    phone2?: string
    relationship: string
    idNumber: string
    typeId: string
    documentPhotoUrl?: string
  }
}

export function useDemandForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CaisseImprevueDemandFormInput>({
    mode: 'onChange',
    defaultValues: {
      memberId: '',
      memberFirstName: '',
      memberLastName: '',
      memberEmail: '',
      memberContacts: [],
      memberMatricule: '',
      memberPhone: '',
      cause: '',
      subscriptionCIID: '',
      subscriptionCICode: '',
      subscriptionCILabel: '',
      subscriptionCIAmountPerMonth: 0,
      subscriptionCINominal: 0,
      subscriptionCIDuration: 12,
      subscriptionCISupportMin: 0,
      subscriptionCISupportMax: 0,
      paymentFrequency: 'MONTHLY',
      desiredStartDate: '',
      emergencyContact: {
        lastName: '',
        firstName: '',
        phone1: '',
        phone2: '',
        relationship: '',
        idNumber: '',
        typeId: '',
        documentPhotoUrl: '',
      },
    },
  })

  // Persistance localStorage
  useDemandFormPersistence(form)

  const nextStep = async () => {
    // Validation de l'étape actuelle
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await form.trigger(fieldsToValidate as any)

    if (isValid && currentStep < 3) {
      setCurrentStep(currentStep + 1)
      // Scroll vers le haut
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      // Scroll vers le haut
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
  }
}

/**
 * Retourne les champs à valider pour une étape donnée
 */
function getFieldsForStep(step: number): (keyof CaisseImprevueDemandFormInput)[] {
  switch (step) {
    case 1:
      return ['memberId', 'cause']
    case 2:
      return ['subscriptionCIID', 'paymentFrequency', 'desiredStartDate']
    case 3:
      return ['emergencyContact']
    default:
      return []
  }
}
