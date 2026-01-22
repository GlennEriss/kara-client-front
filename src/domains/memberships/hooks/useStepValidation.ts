/**
 * Hook pour centraliser la validation des étapes du formulaire d'adhésion
 * 
 * Ce hook utilise le contexte RegisterProvider pour valider les étapes
 * et gérer les erreurs de validation de manière centralisée.
 */

import { useCallback } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { RegisterFormData } from '@/schemas/schemas'
import { useRegister } from '@/providers/RegisterProvider'

export interface UseStepValidationOptions {
  /**
   * Le formulaire react-hook-form
   */
  form: UseFormReturn<RegisterFormData>
  
  /**
   * Numéro de l'étape (1-4)
   */
  step: number
}

export interface UseStepValidationReturn {
  /**
   * Valider l'étape actuelle
   */
  validateStep: () => Promise<boolean>
  
  /**
   * Vérifier si l'étape est complète
   */
  isStepCompleted: boolean
  
  /**
   * Valider un champ spécifique
   */
  validateField: (fieldName: string) => Promise<boolean>
}

/**
 * Hook pour centraliser la validation des étapes
 * 
 * @example
 * ```tsx
 * const { validateStep, isStepCompleted, validateField } = useStepValidation({ form, step: 1 })
 * 
 * const handleNext = async () => {
 *   const isValid = await validateStep()
 *   if (isValid) {
 *     // Passer à l'étape suivante
 *   }
 * }
 * ```
 */
export function useStepValidation({ 
  form, 
  step 
}: UseStepValidationOptions): UseStepValidationReturn {
  const { validateCurrentStep, isStepCompleted: checkStepCompleted } = useRegister()
  const { trigger } = form
  
  /**
   * Valider l'étape actuelle
   */
  const validateStep = useCallback(async (): Promise<boolean> => {
    return await validateCurrentStep()
  }, [validateCurrentStep])
  
  /**
   * Vérifier si l'étape est complète
   */
  const isStepCompleted = checkStepCompleted(step)
  
  /**
   * Valider un champ spécifique
   */
  const validateField = useCallback(async (fieldName: string): Promise<boolean> => {
    return await trigger(fieldName as any)
  }, [trigger])
  
  return {
    validateStep,
    isStepCompleted,
    validateField,
  }
}
