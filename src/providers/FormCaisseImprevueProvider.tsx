'use client'

import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react'
import { useForm, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@/components/ui/form'
import { CaisseImprevuFormMediator } from '@/mediators/CaisseImprevuFormMediator'
import {
  caisseImprevueGlobalSchema,
  defaultCaisseImprevueGlobalValues,
  type CaisseImprevueGlobalFormData,
} from '@/schemas/caisse-imprevue.schema'

// Interface pour une étape
interface Step {
  step: number
  title: string
  description: string
}

// Interface pour le contexte
interface FormCaisseImprevueContextType {
  steps: Step[]
  currentStep: number
  setStep: (step: number) => void
  goToNextStep: () => void
  goToPreviousStep: () => void
  canGoNext: boolean
  canGoPrevious: boolean
  mediator: CaisseImprevuFormMediator
  form: UseFormReturn<CaisseImprevueGlobalFormData>
}

// Création du contexte
const FormCaisseImprevueContext = createContext<FormCaisseImprevueContextType | undefined>(undefined)

// Props du provider
interface FormCaisseImprevueProviderProps {
  children: ReactNode
}

// Provider
export function FormCaisseImprevueProvider({ children }: FormCaisseImprevueProviderProps) {
  const [currentStep, setCurrentStep] = useState(1)

  // Initialisation du médiateur (singleton)
  const mediator = useMemo(() => {
    return CaisseImprevuFormMediator.getInstance()
  }, [])

  // Initialisation du formulaire global avec keepValues pour préserver les données
  const form = useForm<CaisseImprevueGlobalFormData>({
    resolver: zodResolver(caisseImprevueGlobalSchema),
    defaultValues: defaultCaisseImprevueGlobalValues,
    mode: 'onChange',
    shouldUnregister: false, // ✅ Garde les valeurs même quand les champs sont démontés
    criteriaMode: 'all', // Affiche toutes les erreurs
  })

  // Nettoyer les erreurs quand on change d'étape
  useEffect(() => {
    form.clearErrors()
  }, [currentStep, form])

  // Définition des étapes
  const steps: Step[] = [
    {
      step: 1,
      title: 'Membre',
      description: 'Sélection du membre'
    },
    {
      step: 2,
      title: 'Forfait et remboursement',
      description: 'Sélection du forfait et type de remboursement (journalier/mensuel)'
    },
    {
      step: 3,
      title: 'Contact urgent',
      description: 'Informations du contact d\'urgence'
    }
  ]

  // Fonction pour changer d'étape
  const setStep = (step: number) => {
    if (step >= 1 && step <= steps.length) {
      setCurrentStep(step)
    }
  }

  // Fonction pour aller à l'étape suivante
  const goToNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  // Fonction pour aller à l'étape précédente
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Vérifications de navigation
  const canGoNext = currentStep < steps.length
  const canGoPrevious = currentStep > 1

  const value: FormCaisseImprevueContextType = {
    steps,
    currentStep,
    setStep,
    goToNextStep,
    goToPreviousStep,
    canGoNext,
    canGoPrevious,
    mediator,
    form,
  }

  return (
    <FormCaisseImprevueContext.Provider value={value}>
      <Form {...form}>
        <form 
          method="post" 
          onSubmit={form.handleSubmit(mediator.onSubmit, mediator.onInvalid)}
          className="w-full"
        >
          {children}
        </form>
      </Form>
    </FormCaisseImprevueContext.Provider>
  )
}

// Hook personnalisé pour utiliser le contexte
export function useFormCaisseImprevueProvider() {
  const context = useContext(FormCaisseImprevueContext)
  
  if (context === undefined) {
    throw new Error('useFormCaisseImprevueProvider doit être utilisé à l\'intérieur de FormCaisseImprevueProvider')
  }
  
  return context
}

// Export par défaut du provider
export default FormCaisseImprevueProvider

