/**
 * Tests unitaires pour useStepValidation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { useStepValidation } from '../../../hooks/useStepValidation'
import type { RegisterFormData } from '@/schemas/schemas'

// Mock useRegister
const mockValidateCurrentStep = vi.fn()
const mockIsStepCompleted = vi.fn()

vi.mock('@/providers/RegisterProvider', () => ({
  useRegister: () => ({
    validateCurrentStep: mockValidateCurrentStep,
    isStepCompleted: mockIsStepCompleted,
  }),
}))

describe('useStepValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait retourner validateStep qui appelle validateCurrentStep', async () => {
    mockValidateCurrentStep.mockResolvedValue(true)
    
    const { result: formResult } = renderHook(() =>
      useForm<RegisterFormData>({
        defaultValues: {},
      })
    )
    const form = formResult.current

    const { result } = renderHook(() => useStepValidation({ form, step: 1 }))

    const isValid = await result.current.validateStep()

    expect(mockValidateCurrentStep).toHaveBeenCalledTimes(1)
    expect(isValid).toBe(true)
  })

  it('devrait retourner isStepCompleted depuis useRegister', () => {
    mockIsStepCompleted.mockReturnValue(true)
    
    const { result: formResult } = renderHook(() =>
      useForm<RegisterFormData>({
        defaultValues: {},
      })
    )
    const form = formResult.current

    const { result } = renderHook(() => useStepValidation({ form, step: 2 }))

    expect(mockIsStepCompleted).toHaveBeenCalledWith(2)
    expect(result.current.isStepCompleted).toBe(true)
  })

  it('devrait retourner validateField qui appelle trigger avec le nom du champ', async () => {
    const { result: formResult } = renderHook(() =>
      useForm<RegisterFormData>({
        defaultValues: {},
      })
    )
    const form = formResult.current
    const triggerSpy = vi.spyOn(form, 'trigger').mockResolvedValue(true)

    const { result } = renderHook(() => useStepValidation({ form, step: 1 }))

    const isValid = await result.current.validateField('firstName')

    expect(triggerSpy).toHaveBeenCalledWith('firstName')
    expect(isValid).toBe(true)
  })

  it('devrait gérer les erreurs de validation', async () => {
    mockValidateCurrentStep.mockResolvedValue(false)
    
    const { result: formResult } = renderHook(() =>
      useForm<RegisterFormData>({
        defaultValues: {},
      })
    )
    const form = formResult.current

    const { result } = renderHook(() => useStepValidation({ form, step: 1 }))

    const isValid = await result.current.validateStep()

    expect(isValid).toBe(false)
  })

  it('devrait gérer les erreurs lors de la validation d\'un champ', async () => {
    const { result: formResult } = renderHook(() =>
      useForm<RegisterFormData>({
        defaultValues: {},
      })
    )
    const form = formResult.current
    const triggerSpy = vi.spyOn(form, 'trigger').mockResolvedValue(false)

    const { result } = renderHook(() => useStepValidation({ form, step: 1 }))

    const isValid = await result.current.validateField('lastName')

    expect(triggerSpy).toHaveBeenCalledWith('lastName')
    expect(isValid).toBe(false)
  })

  it('devrait fonctionner avec différentes étapes', () => {
    mockIsStepCompleted.mockReturnValue(false)
    
    const { result: formResult } = renderHook(() =>
      useForm<RegisterFormData>({
        defaultValues: {},
      })
    )
    const form = formResult.current

    const { result: result1 } = renderHook(() => useStepValidation({ form, step: 1 }))
    const { result: result2 } = renderHook(() => useStepValidation({ form, step: 3 }))
    const { result: result3 } = renderHook(() => useStepValidation({ form, step: 4 }))

    expect(mockIsStepCompleted).toHaveBeenCalledWith(1)
    expect(mockIsStepCompleted).toHaveBeenCalledWith(3)
    expect(mockIsStepCompleted).toHaveBeenCalledWith(4)
    expect(result1.current.isStepCompleted).toBe(false)
    expect(result2.current.isStepCompleted).toBe(false)
    expect(result3.current.isStepCompleted).toBe(false)
  })
})
