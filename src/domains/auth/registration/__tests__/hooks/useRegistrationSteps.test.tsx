/**
 * Tests unitaires pour useRegistrationSteps
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRegistrationSteps } from '../../hooks/useRegistrationSteps'

describe('useRegistrationSteps', () => {
  describe('initialisation', () => {
    it('devrait initialiser avec l\'étape 1 par défaut', () => {
      const { result } = renderHook(() => useRegistrationSteps())

      expect(result.current.currentStep).toBe(1)
      expect(result.current.totalSteps).toBe(4)
      expect(result.current.completedSteps.size).toBe(0)
    })

    it('devrait initialiser avec une étape personnalisée', () => {
      const { result } = renderHook(() => useRegistrationSteps({ initialStep: 2 }))

      expect(result.current.currentStep).toBe(2)
    })
  })

  describe('nextStep', () => {
    it('devrait passer à l\'étape suivante si valide', () => {
      const { result } = renderHook(() => useRegistrationSteps())

      act(() => {
        result.current.nextStep(true)
      })

      expect(result.current.currentStep).toBe(2)
      expect(result.current.completedSteps.has(1)).toBe(true)
    })

    it('ne devrait pas passer à l\'étape suivante si invalide', () => {
      const { result } = renderHook(() => useRegistrationSteps())

      act(() => {
        result.current.nextStep(false)
      })

      expect(result.current.currentStep).toBe(1)
      expect(result.current.completedSteps.has(1)).toBe(false)
    })

    it('ne devrait pas dépasser la dernière étape', () => {
      const { result } = renderHook(() => useRegistrationSteps({ initialStep: 4 }))

      act(() => {
        result.current.nextStep(true)
      })

      expect(result.current.currentStep).toBe(4)
    })

    it('devrait appeler onStepChange lors du passage à l\'étape suivante', () => {
      const onStepChange = vi.fn()
      const { result } = renderHook(() => useRegistrationSteps({ onStepChange }))

      act(() => {
        result.current.nextStep(true)
      })

      expect(onStepChange).toHaveBeenCalledWith(2)
    })
  })

  describe('prevStep', () => {
    it('devrait revenir à l\'étape précédente', () => {
      const { result } = renderHook(() => useRegistrationSteps({ initialStep: 3 }))

      act(() => {
        result.current.prevStep()
      })

      expect(result.current.currentStep).toBe(2)
    })

    it('ne devrait pas descendre en dessous de l\'étape 1', () => {
      const { result } = renderHook(() => useRegistrationSteps())

      act(() => {
        result.current.prevStep()
      })

      expect(result.current.currentStep).toBe(1)
    })

    it('devrait appeler onStepChange lors du retour à l\'étape précédente', () => {
      const onStepChange = vi.fn()
      const { result } = renderHook(() => useRegistrationSteps({ initialStep: 3, onStepChange }))

      act(() => {
        result.current.prevStep()
      })

      expect(onStepChange).toHaveBeenCalledWith(2)
    })
  })

  describe('goToStep', () => {
    it('devrait aller à une étape spécifique valide', () => {
      const { result } = renderHook(() => useRegistrationSteps())

      act(() => {
        result.current.goToStep(3)
      })

      expect(result.current.currentStep).toBe(3)
    })

    it('ne devrait pas aller à une étape invalide (< 1)', () => {
      const { result } = renderHook(() => useRegistrationSteps({ initialStep: 2 }))

      act(() => {
        result.current.goToStep(0)
      })

      expect(result.current.currentStep).toBe(2)
    })

    it('ne devrait pas aller à une étape invalide (> totalSteps)', () => {
      const { result } = renderHook(() => useRegistrationSteps({ initialStep: 2 }))

      act(() => {
        result.current.goToStep(99)
      })

      expect(result.current.currentStep).toBe(2)
    })

    it('devrait appeler onStepChange lors du changement d\'étape', () => {
      const onStepChange = vi.fn()
      const { result } = renderHook(() => useRegistrationSteps({ onStepChange }))

      act(() => {
        result.current.goToStep(3)
      })

      expect(onStepChange).toHaveBeenCalledWith(3)
    })
  })

  describe('markStepCompleted', () => {
    it('devrait marquer une étape comme complétée', () => {
      const { result } = renderHook(() => useRegistrationSteps())

      act(() => {
        result.current.markStepCompleted(2)
      })

      expect(result.current.isStepCompleted(2)).toBe(true)
    })

    it('devrait marquer plusieurs étapes comme complétées', () => {
      const { result } = renderHook(() => useRegistrationSteps())

      act(() => {
        result.current.markStepCompleted(1)
        result.current.markStepCompleted(2)
        result.current.markStepCompleted(3)
      })

      expect(result.current.isStepCompleted(1)).toBe(true)
      expect(result.current.isStepCompleted(2)).toBe(true)
      expect(result.current.isStepCompleted(3)).toBe(true)
    })
  })

  describe('isStepCompleted', () => {
    it('devrait retourner true si l\'étape est complétée', () => {
      const { result } = renderHook(() => useRegistrationSteps())

      act(() => {
        result.current.markStepCompleted(2)
      })

      expect(result.current.isStepCompleted(2)).toBe(true)
    })

    it('devrait retourner false si l\'étape n\'est pas complétée', () => {
      const { result } = renderHook(() => useRegistrationSteps())

      expect(result.current.isStepCompleted(2)).toBe(false)
    })
  })

  describe('getProgress', () => {
    it('devrait retourner 0% si aucune étape complétée', () => {
      const { result } = renderHook(() => useRegistrationSteps())

      expect(result.current.getProgress()).toBe(0)
    })

    it('devrait retourner 25% si 1 étape complétée sur 4', () => {
      const { result } = renderHook(() => useRegistrationSteps())

      act(() => {
        result.current.markStepCompleted(1)
      })

      expect(result.current.getProgress()).toBe(25)
    })

    it('devrait retourner 100% si toutes les étapes sont complétées', () => {
      const { result } = renderHook(() => useRegistrationSteps())

      act(() => {
        result.current.markStepCompleted(1)
        result.current.markStepCompleted(2)
        result.current.markStepCompleted(3)
        result.current.markStepCompleted(4)
      })

      expect(result.current.getProgress()).toBe(100)
    })
  })

  describe('resetSteps', () => {
    it('devrait réinitialiser les étapes à 1 et vider les étapes complétées', () => {
      const { result } = renderHook(() => useRegistrationSteps({ initialStep: 3 }))

      act(() => {
        result.current.markStepCompleted(1)
        result.current.markStepCompleted(2)
        result.current.markStepCompleted(3)
        result.current.resetSteps()
      })

      expect(result.current.currentStep).toBe(1)
      expect(result.current.completedSteps.size).toBe(0)
    })
  })

  describe('setCurrentStep et setCompletedSteps', () => {
    it('devrait permettre de définir l\'étape actuelle directement', () => {
      const { result } = renderHook(() => useRegistrationSteps())

      act(() => {
        result.current.setCurrentStep(3)
      })

      expect(result.current.currentStep).toBe(3)
    })

    it('devrait permettre de définir les étapes complétées directement', () => {
      const { result } = renderHook(() => useRegistrationSteps())

      act(() => {
        result.current.setCompletedSteps(new Set([1, 2, 3]))
      })

      expect(result.current.completedSteps.size).toBe(3)
      expect(result.current.isStepCompleted(1)).toBe(true)
      expect(result.current.isStepCompleted(2)).toBe(true)
      expect(result.current.isStepCompleted(3)).toBe(true)
    })
  })
})
