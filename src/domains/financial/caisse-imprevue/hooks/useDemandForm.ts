/**
 * Hook pour gérer le formulaire multi-étapes de création de demande
 * 
 * Utilise react-hook-form avec validation Zod par étape
 * Conforme à la documentation WORKFLOW.md et SOLUTIONS_PROPOSEES.md
 */

import { useForm, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useDemandFormPersistence } from './useDemandFormPersistence'
import { createDemandSchema } from '../schemas/demand-steps.schema'
import type { z } from 'zod'

// Type dérivé du schema Zod pour garantir la cohérence
export type CaisseImprevueDemandFormInput = z.infer<typeof createDemandSchema>

// Valeurs par défaut du formulaire
const defaultValues: Partial<CaisseImprevueDemandFormInput> = {
  // Step 1
  memberId: '',
  memberFirstName: '',
  memberLastName: '',
  memberEmail: '',
  memberContacts: [],
  memberMatricule: '',
  memberPhone: '',
  cause: '',

  // Step 2
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

  // Step 3
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
}

export function useDemandForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Utiliser zodResolver avec le schema complet pour la validation
  const form = useForm<CaisseImprevueDemandFormInput>({
    resolver: zodResolver(createDemandSchema),
    mode: 'onChange', // Validation en temps réel
    defaultValues: defaultValues as CaisseImprevueDemandFormInput,
  })

  // Persistance localStorage
  useDemandFormPersistence(form)

  const nextStep = async () => {
    // Validation de l'étape actuelle avec les champs spécifiques
    const fieldsToValidate = getFieldsForStep(currentStep)
    
    // Pour Step 3, on ne peut pas aller plus loin (c'est la dernière étape)
    if (currentStep === 3) {
      console.log('Étape 3 : Utiliser le bouton "Créer la demande" pour soumettre')
      return
    }
    
    // Pour les étapes 1 et 2, valider et passer à l'étape suivante
    const isValid = await form.trigger(fieldsToValidate as any)
    
    if (isValid && currentStep < 3) {
      setCurrentStep(currentStep + 1)
      // Scroll vers le haut
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (!isValid) {
      // Afficher les erreurs si la validation échoue
      console.log('Erreurs de validation:', form.formState.errors)
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
 * Conforme à la documentation : validation stricte par étape
 */
function getFieldsForStep(step: number): (keyof CaisseImprevueDemandFormInput)[] {
  switch (step) {
    case 1:
      // Step 1 : Membre + Motif (tous les champs requis)
      return [
        'memberId',
        'memberFirstName',
        'memberLastName',
        'memberMatricule',
        'cause',
      ]
    case 2:
      // Step 2 : Forfait + Fréquence + Date
      return [
        'subscriptionCIID',
        'subscriptionCICode',
        'subscriptionCIAmountPerMonth',
        'subscriptionCIDuration',
        'paymentFrequency',
        'desiredStartDate',
      ]
    case 3:
      // Step 3 : Contact d'urgence (tous les champs requis)
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
