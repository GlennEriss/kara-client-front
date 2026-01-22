/**
 * Tests unitaires pour useStep4Validation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { useStep4Validation } from '../../../hooks/useStep4Validation'
import type { RegisterFormData } from '@/schemas/schemas'

describe('useStep4Validation', () => {
  it('devrait synchroniser termsAccepted avec le formulaire', async () => {
    const { result: formResult } = renderHook(() =>
      useForm<RegisterFormData>({
        defaultValues: {
          documents: {
            termsAccepted: false,
            identityCardFront: null,
            identityCardBack: null,
            photo: null,
            documentPhotoFront: null,
            documentPhotoBack: null,
            expirationDate: '',
            issuingPlace: '',
            issuingDate: '',
          },
        },
      })
    )
    const form = formResult.current

    const { rerender } = renderHook(
      ({ termsAccepted }) => useStep4Validation({ form, termsAccepted }),
      { initialProps: { termsAccepted: false } }
    )

    // Changer termsAccepted
    rerender({ termsAccepted: true })

    await waitFor(() => {
      expect(form.getValues('documents.termsAccepted')).toBe(true)
    })
  })

  it('devrait définir une erreur si termsAccepted est false', async () => {
    const { result: formResult } = renderHook(() =>
      useForm<RegisterFormData>({
        defaultValues: {
          documents: {
            termsAccepted: false,
            identityCardFront: null,
            identityCardBack: null,
            photo: null,
            documentPhotoFront: null,
            documentPhotoBack: null,
            expirationDate: '',
            issuingPlace: '',
            issuingDate: '',
          },
        },
      })
    )
    const form = formResult.current

    renderHook(() => useStep4Validation({ form, termsAccepted: false }))

    await waitFor(() => {
      const error = form.formState.errors.documents?.termsAccepted
      expect(error).toBeDefined()
      expect(error?.message).toContain('accepter les conditions')
    })
  })

  it('devrait effacer l\'erreur si termsAccepted devient true', async () => {
    const { result: formResult } = renderHook(() =>
      useForm<RegisterFormData>({
        defaultValues: {
          documents: {
            termsAccepted: false,
            identityCardFront: null,
            identityCardBack: null,
            photo: null,
            documentPhotoFront: null,
            documentPhotoBack: null,
            expirationDate: '',
            issuingPlace: '',
            issuingDate: '',
          },
        },
      })
    )
    const form = formResult.current

    const { rerender } = renderHook(
      ({ termsAccepted }) => useStep4Validation({ form, termsAccepted }),
      { initialProps: { termsAccepted: false } }
    )

    await waitFor(() => {
      expect(form.formState.errors.documents?.termsAccepted).toBeDefined()
    })

    rerender({ termsAccepted: true })

    await waitFor(() => {
      expect(form.formState.errors.documents?.termsAccepted).toBeUndefined()
    })
  })

  it('devrait valider les champs obligatoires en temps réel', async () => {
    const { result: formResult } = renderHook(() =>
      useForm<RegisterFormData>({
        defaultValues: {
          documents: {
            termsAccepted: true,
            identityCardFront: null,
            identityCardBack: null,
            photo: null,
            documentPhotoFront: null,
            documentPhotoBack: null,
            expirationDate: '',
            issuingPlace: '',
            issuingDate: '',
          },
        },
      })
    )
    const form = formResult.current

    renderHook(() => useStep4Validation({ form, termsAccepted: true }))

    await waitFor(() => {
      expect(form.formState.errors.documents?.documentPhotoFront).toBeDefined()
      expect(form.formState.errors.documents?.expirationDate).toBeDefined()
      expect(form.formState.errors.documents?.issuingPlace).toBeDefined()
      expect(form.formState.errors.documents?.issuingDate).toBeDefined()
    })
  })

  it('devrait valider les champs obligatoires en temps réel', async () => {
    const { result: formResult } = renderHook(() =>
      useForm<RegisterFormData>({
        defaultValues: {
          documents: {
            termsAccepted: true,
            identityCardFront: null,
            identityCardBack: null,
            photo: null,
            documentPhotoFront: null,
            documentPhotoBack: null,
            expirationDate: '',
            issuingPlace: '',
            issuingDate: '',
          },
        },
      })
    )
    const form = formResult.current

    renderHook(() => useStep4Validation({ form, termsAccepted: true }))

    // Vérifier que les erreurs sont définies pour les champs requis
    await waitFor(() => {
      expect(form.formState.errors.documents?.documentPhotoFront).toBeDefined()
      expect(form.formState.errors.documents?.expirationDate).toBeDefined()
      expect(form.formState.errors.documents?.issuingPlace).toBeDefined()
      expect(form.formState.errors.documents?.issuingDate).toBeDefined()
    }, { timeout: 2000 })
  })
})
