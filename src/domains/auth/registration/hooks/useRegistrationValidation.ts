/**
 * Hook pour la validation des étapes du formulaire d'inscription
 */

import { useCallback } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import type { RegisterFormData } from '@/domains/auth/registration/entities'
import { stepSchemas } from '@/schemas/schemas'
import { STEP_TO_SECTION_MAP } from '@/domains/auth/registration/entities/registration-form.types'

interface UseRegistrationValidationProps {
  form: UseFormReturn<RegisterFormData>
}

export function useRegistrationValidation({ form }: UseRegistrationValidationProps) {
  const { trigger, getValues, setError, formState } = form

  /**
   * Valide une étape spécifique
   */
  const validateStep = useCallback(
    async (step: number): Promise<boolean> => {
      const sectionKey = STEP_TO_SECTION_MAP[step as keyof typeof STEP_TO_SECTION_MAP]
      const schema = stepSchemas[step as keyof typeof stepSchemas]

      if (!sectionKey || !schema) {
        console.warn(`[useRegistrationValidation] Étape ${step} invalide`)
        return false
      }

      try {
        // Valider avec react-hook-form
        const isFormValid = await trigger(sectionKey)

        // Valider avec Zod pour une validation plus stricte
        const stepData = getValues(sectionKey)
        await schema.parseAsync(stepData)

        // Vérifier qu'il n'y a pas d'erreurs dans la section
        const sectionErrors = formState.errors[sectionKey]
        const hasErrors = sectionErrors && Object.keys(sectionErrors).length > 0

        return isFormValid && !hasErrors
      } catch (error) {
        console.warn(`[useRegistrationValidation] Erreur de validation step ${step}:`, error)

        // Si c'est une erreur Zod, appliquer les erreurs au formulaire
        if (error instanceof z.ZodError) {
          error.issues.forEach((issue) => {
            const fieldPath = issue.path.join('.')
            setError(`${sectionKey}.${fieldPath}` as any, {
              type: 'manual',
              message: issue.message,
            })
          })
        }

        return false
      }
    },
    [trigger, getValues, setError, formState.errors]
  )

  /**
   * Valide l'étape actuelle
   */
  const validateCurrentStep = useCallback(
    async (currentStep: number): Promise<boolean> => {
      return validateStep(currentStep)
    },
    [validateStep]
  )

  return {
    validateStep,
    validateCurrentStep,
  }
}
