'use client'

import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect, useRef } from 'react'
import { useForm, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@/components/ui/form'
import { CaisseImprevuFormMediator } from '@/mediators/CaisseImprevuFormMediator'
import {
  caisseImprevueGlobalSchema,
  caisseImprevueStep1Schema,
  caisseImprevueStep2Schema,
  caisseImprevueStep3Schema,
  defaultCaisseImprevueGlobalValues,
  type CaisseImprevueGlobalFormData,
} from '@/schemas/caisse-imprevue.schema'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

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
  const currentStepRef = useRef(currentStep)
  const router = useRouter()
  const { user } = useAuth()

  // Mettre à jour la ref quand currentStep change
  useEffect(() => {
    currentStepRef.current = currentStep
  }, [currentStep])

  // Initialisation du médiateur (singleton)
  const mediator = useMemo(() => {
    const mediator = CaisseImprevuFormMediator.getInstance()
    mediator.setRouter(router)
    return mediator
  }, [router])

  // Définir le userId dans le médiateur quand l'utilisateur change
  useEffect(() => {
    if (user?.uid) {
      mediator.setUserId(user.uid)
    }
  }, [user, mediator])

  // Initialisation du formulaire global avec keepValues pour préserver les données
  const form = useForm<CaisseImprevueGlobalFormData>({
    resolver: async (values, context, options) => {
      const step = currentStepRef.current

      // Normaliser les numéros de téléphone en retirant les espaces avant la validation
      const normalizedValues = {
        ...values,
        step3: values.step3 ? {
          ...values.step3,
          phone1: values.step3.phone1?.replace(/\s/g, '') || '',
          phone2: values.step3.phone2?.replace(/\s/g, '') || ''
        } : values.step3
      }

      // @ts-ignore - Typage complexe, mais fonctionnel
      const schemaToUse = step === 1
        ? z.object({ step1: caisseImprevueStep1Schema, step2: z.any().optional(), step3: z.any().optional() })
        : step === 2
          ? z.object({ step1: caisseImprevueStep1Schema, step2: caisseImprevueStep2Schema, step3: z.any().optional() })
          : caisseImprevueGlobalSchema

      // @ts-ignore
      return zodResolver(schemaToUse)(normalizedValues, context, options)
    },
    defaultValues: defaultCaisseImprevueGlobalValues,
    mode: 'onSubmit',
    shouldUnregister: false,
    criteriaMode: 'all',
  })

  // Nettoyer les erreurs quand on change d'étape ET préserver les valeurs
  useEffect(() => {
    form.clearErrors()

    // Debug : afficher les valeurs actuelles du formulaire
    const formValues = form.getValues()
    console.log('📝 Valeurs du formulaire à l\'étape', currentStep, ':', formValues)
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
      // Scroll vers le haut de la page
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Fonction pour aller à l'étape suivante
  const goToNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
      // Scroll vers le haut de la page
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Fonction pour aller à l'étape précédente
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      // Scroll vers le haut de la page
      window.scrollTo({ top: 0, behavior: 'smooth' })
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

