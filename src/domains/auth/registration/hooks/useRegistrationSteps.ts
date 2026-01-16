/**
 * Hook pour la gestion de la navigation entre les étapes du formulaire
 */

import { useCallback, useState } from 'react'
import { TOTAL_STEPS } from '@/domains/auth/registration/entities/registration-form.types'

interface UseRegistrationStepsProps {
  initialStep?: number
  onStepChange?: (step: number) => void
}

export function useRegistrationSteps({ initialStep = 1, onStepChange }: UseRegistrationStepsProps = {}) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  /**
   * Passe à l'étape suivante
   */
  const nextStep = useCallback(
    (isValid: boolean = true): boolean => {
      if (isValid && currentStep < TOTAL_STEPS) {
        const newStep = currentStep + 1
        setCompletedSteps((prev) => new Set([...prev, currentStep]))
        setCurrentStep(newStep)
        onStepChange?.(newStep)
        return true
      }
      return false
    },
    [currentStep, onStepChange]
  )

  /**
   * Revient à l'étape précédente
   */
  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      const newStep = currentStep - 1
      setCurrentStep(newStep)
      onStepChange?.(newStep)
    }
  }, [currentStep, onStepChange])

  /**
   * Va directement à une étape spécifique
   */
  const goToStep = useCallback(
    (step: number) => {
      if (step >= 1 && step <= TOTAL_STEPS) {
        setCurrentStep(step)
        onStepChange?.(step)
      }
    },
    [onStepChange]
  )

  /**
   * Marque une étape comme complétée
   */
  const markStepCompleted = useCallback((step: number) => {
    setCompletedSteps((prev) => new Set([...prev, step]))
  }, [])

  /**
   * Vérifie si une étape est complétée
   */
  const isStepCompleted = useCallback(
    (step: number): boolean => {
      return completedSteps.has(step)
    },
    [completedSteps]
  )

  /**
   * Calcule le pourcentage de progression
   */
  const getProgress = useCallback((): number => {
    return (completedSteps.size / TOTAL_STEPS) * 100
  }, [completedSteps])

  /**
   * Réinitialise les étapes
   */
  const resetSteps = useCallback(() => {
    setCurrentStep(1)
    setCompletedSteps(new Set())
  }, [])

  return {
    currentStep,
    totalSteps: TOTAL_STEPS,
    completedSteps,
    nextStep,
    prevStep,
    goToStep,
    markStepCompleted,
    isStepCompleted,
    getProgress,
    resetSteps,
    setCurrentStep,
    setCompletedSteps,
  }
}
