/**
 * Hook pour centraliser la validation de Step4 (documents)
 * 
 * Ce hook centralise la logique de validation des champs obligatoires
 * de l'étape 4 du formulaire d'adhésion.
 */

import { useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { RegisterFormData } from '@/schemas/schemas'

interface UseStep4ValidationOptions {
  /**
   * Le formulaire react-hook-form
   */
  form: UseFormReturn<RegisterFormData>
  
  /**
   * État local pour les conditions acceptées
   */
  termsAccepted: boolean
}

/**
 * Hook pour centraliser la validation de Step4
 * 
 * @example
 * ```tsx
 * const { validateFields } = useStep4Validation({ form, termsAccepted })
 * ```
 */
export function useStep4Validation({ 
  form, 
  termsAccepted 
}: UseStep4ValidationOptions) {
  const { watch, setValue, setError, clearErrors, formState: { errors } } = form

  // Synchroniser le state local avec le formulaire
  useEffect(() => {
    setValue('documents.termsAccepted', termsAccepted)
  }, [termsAccepted, setValue])

  // Validation des conditions acceptées
  useEffect(() => {
    if (!termsAccepted) {
      setError('documents.termsAccepted', {
        type: 'required',
        message: 'Vous devez accepter les conditions pour continuer'
      })
    } else {
      clearErrors('documents.termsAccepted')
    }
  }, [termsAccepted, setError, clearErrors])

  // Validation en temps réel des champs obligatoires
  useEffect(() => {
    const frontPhoto = watch('documents.documentPhotoFront')
    const expirationDate = watch('documents.expirationDate')
    const issuingPlace = watch('documents.issuingPlace')
    const issuingDate = watch('documents.issuingDate')

    // Validation photo recto
    if (!frontPhoto) {
      setError('documents.documentPhotoFront', {
        type: 'required',
        message: 'La photo recto de la pièce d\'identité est requise'
      })
    } else {
      clearErrors('documents.documentPhotoFront')
    }

    // Validation date d'expiration
    if (!expirationDate || expirationDate.trim() === '') {
      setError('documents.expirationDate', {
        type: 'required',
        message: 'La date d\'expiration est requise'
      })
    } else {
      clearErrors('documents.expirationDate')
    }

    // Validation lieu de délivrance
    if (!issuingPlace || issuingPlace.trim() === '') {
      setError('documents.issuingPlace', {
        type: 'required',
        message: 'Le lieu de délivrance est requis'
      })
    } else if (issuingPlace.length < 2) {
      setError('documents.issuingPlace', {
        type: 'minLength',
        message: 'Le lieu de délivrance doit contenir au moins 2 caractères'
      })
    } else {
      clearErrors('documents.issuingPlace')
    }

    // Validation date de délivrance
    if (!issuingDate || issuingDate.trim() === '') {
      setError('documents.issuingDate', {
        type: 'required',
        message: 'La date de délivrance est requise'
      })
    } else {
      clearErrors('documents.issuingDate')
    }
  }, [
    watch('documents.documentPhotoFront'),
    watch('documents.expirationDate'),
    watch('documents.issuingPlace'),
    watch('documents.issuingDate'),
    setError,
    clearErrors,
    watch
  ])

  // Nettoyer automatiquement les erreurs quand les champs sont corrigés
  useEffect(() => {
    const subscription = watch((value: any) => {
      // Nettoyer les erreurs de type de document
      if (value.documents?.identityDocument && errors.documents?.identityDocument) {
        clearErrors('documents.identityDocument')
      }

      // Nettoyer les erreurs de numéro de document
      if (value.documents?.identityDocumentNumber && value.documents.identityDocumentNumber.length >= 1 && errors.documents?.identityDocumentNumber) {
        clearErrors('documents.identityDocumentNumber')
      }

      // Nettoyer les erreurs de photo verso
      if (value.documents?.documentPhotoBack && errors.documents?.documentPhotoBack) {
        clearErrors('documents.documentPhotoBack')
      }
    })

    return () => subscription.unsubscribe()
  }, [watch, clearErrors, errors.documents])
}
