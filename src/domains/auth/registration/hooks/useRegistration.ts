/**
 * Hook principal pour la gestion du formulaire d'inscription
 * Orchestre les services, le cache, la validation et la navigation
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import type { RegisterFormData } from '@/domains/auth/registration/entities'
import type { CorrectionRequest } from '@/domains/auth/registration/entities'
import { registerSchema, defaultValues } from '@/schemas/schemas'
import { IRegistrationService } from '../services/IRegistrationService'
import { IRegistrationCacheService } from '../services/IRegistrationCacheService'
import { useRegistrationSteps } from './useRegistrationSteps'
import { useRegistrationValidation } from './useRegistrationValidation'
import { getMembershipRequestById } from '@/db/membership.db'

interface UseRegistrationProps {
  registrationService: IRegistrationService
  cacheService: IRegistrationCacheService
}

export function useRegistration({
  registrationService,
  cacheService,
}: UseRegistrationProps) {
  // État du formulaire
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues,
    mode: 'onChange',
  })

  const { watch, getValues, reset } = form

  // État de l'application
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCacheLoaded, setIsCacheLoaded] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [userData, setUserData] = useState<{
    firstName?: string
    lastName?: string
    civility?: string
  }>()
  const [correctionRequest, setCorrectionRequest] = useState<CorrectionRequest | null>(null)
  const [securityCodeInput, setSecurityCodeInput] = useState<string>('')

  // Hooks de navigation et validation
  const {
    currentStep,
    totalSteps,
    completedSteps,
    nextStep: navigateNext,
    prevStep: navigatePrev,
    goToStep,
    isStepCompleted,
    getProgress,
    resetSteps,
    setCurrentStep,
    setCompletedSteps,
  } = useRegistrationSteps({
    initialStep: cacheService.loadCurrentStep(),
    onStepChange: (step) => {
      cacheService.saveCurrentStep(step)
    },
  })

  const { validateStep, validateCurrentStep: validateCurrent } = useRegistrationValidation({ form })

  // Ref pour le debounce de sauvegarde
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // ================== CHARGEMENT INITIAL ==================
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true)

      try {
        // 1. Vérifier s'il y a un requestId dans l'URL (corrections)
        const urlParams = new URLSearchParams(window.location.search)
        const requestId = urlParams.get('requestId')

        if (requestId) {
          try {
            const request = await getMembershipRequestById(requestId)
            if (request?.reviewNote && request?.securityCode) {
              if (request.securityCodeUsed) {
                toast.error('Code déjà utilisé', {
                  description: 'Ce code de sécurité a déjà été utilisé.',
                  duration: 5000,
                })
                setIsCacheLoaded(true)
                return
              }

              // Vérifier l'expiration
              const expiry = request.securityCodeExpiry
                ? request.securityCodeExpiry instanceof Date
                  ? request.securityCodeExpiry
                  : (request.securityCodeExpiry as any)?.toDate
                  ? (request.securityCodeExpiry as any).toDate()
                  : new Date(request.securityCodeExpiry)
                : null

              if (expiry && expiry < new Date()) {
                toast.error('Code expiré', {
                  description: 'Le code de sécurité a expiré.',
                  duration: 5000,
                })
                setIsCacheLoaded(true)
                return
              }

              cacheService.clearSubmissionData()
              setCorrectionRequest({
                requestId: request.id,
                reviewNote: request.reviewNote,
                securityCode: request.securityCode,
                isVerified: false,
              })
              setIsCacheLoaded(true)
              return
            }
          } catch (error) {
            console.error('[useRegistration] Erreur lors du chargement de la demande:', error)
          }
        }

        // 2. Vérifier s'il y a une soumission valide
        const submissionData = cacheService.loadSubmissionData()
        if (submissionData) {
          const membershipExists = await getMembershipRequestById(submissionData.membershipId)
          if (membershipExists) {
            setIsSubmitted(true)
            setUserData(submissionData.userData)
            setIsCacheLoaded(true)
            return
          } else {
            cacheService.clearSubmissionData()
          }
        }

        // 3. Charger les données du cache
        const cachedData = cacheService.loadFormData()
        if (cachedData) {
          const mergedData = { ...defaultValues, ...cachedData }
          reset(mergedData)
        }

        setCurrentStep(cacheService.loadCurrentStep())
        setCompletedSteps(cacheService.loadCompletedSteps())
        setIsCacheLoaded(true)
      } catch (error) {
        console.error('[useRegistration] Erreur lors du chargement initial:', error)
        cacheService.clearAll()
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [reset, cacheService, setCurrentStep, setCompletedSteps])

  // ================== SAUVEGARDE AUTOMATIQUE ==================
  const debouncedSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      if (isCacheLoaded) {
        const currentData = getValues()
        cacheService.saveFormData(currentData)
        cacheService.saveCurrentStep(currentStep)
        cacheService.saveCompletedSteps(completedSteps)
      }
    }, 500) // 500ms de debounce
  }, [getValues, currentStep, completedSteps, isCacheLoaded, cacheService])

  // Surveiller les changements du formulaire
  useEffect(() => {
    const subscription = watch(() => {
      debouncedSave()
    })
    return () => subscription.unsubscribe()
  }, [watch, debouncedSave])

  // Sauvegarder lors des changements d'étape
  useEffect(() => {
    if (isCacheLoaded) {
      debouncedSave()
    }
  }, [currentStep, completedSteps, debouncedSave, isCacheLoaded])

  // ================== NAVIGATION ==================
  const nextStep = useCallback(async (): Promise<boolean> => {
    const isValid = await validateCurrent(currentStep)
    if (isValid) {
      return navigateNext(true)
    }
    return false
  }, [currentStep, validateCurrent, navigateNext])

  const prevStep = useCallback(() => {
    navigatePrev()
  }, [navigatePrev])

  // ================== VALIDATION ==================
  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    return validateCurrent(currentStep)
  }, [currentStep, validateCurrent])

  // ================== SOUMISSION ==================
  const submitForm = useCallback(async () => {
    setIsSubmitting(true)
    setIsLoading(true)
    setSubmissionError(null)

    try {
      const formData = getValues()

      // Nettoyer les données obsolètes
      if ('insurance' in formData) {
        delete (formData as any).insurance
        reset({ ...defaultValues, ...formData })
      }

      let membershipId: string

      if (correctionRequest?.isVerified) {
        // Mise à jour d'une demande existante
        const success = await registrationService.updateRegistration(
          correctionRequest.requestId,
          formData
        )
        if (!success) {
          throw new Error('Échec de la mise à jour de la demande')
        }
        membershipId = correctionRequest.requestId
      } else {
        // Nouvelle demande
        membershipId = await registrationService.submitRegistration(formData)
      }

      // Succès
      const userData = {
        firstName: formData.identity.firstName,
        lastName: formData.identity.lastName,
        civility: formData.identity.civility,
      }

      cacheService.clearFormDataOnly()
      cacheService.saveSubmissionData(membershipId, userData)

      const displayName = [userData.civility, userData.firstName, userData.lastName]
        .filter(Boolean)
        .join(' ')

      toast.success(correctionRequest ? 'Corrections soumises !' : 'Inscription réussie !', {
        description: `Demande soumise avec succès ${displayName}`,
        duration: 4000,
      })

      setIsSubmitted(true)
      setUserData(userData)
      setCorrectionRequest(null)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite'
      setSubmissionError(errorMessage)

      toast.error('Échec de l\'inscription', {
        description: errorMessage,
        duration: 5000,
      })

      throw error
    } finally {
      setIsSubmitting(false)
      setIsLoading(false)
    }
  }, [getValues, reset, correctionRequest, registrationService, cacheService])

  // ================== VÉRIFICATION DU CODE DE SÉCURITÉ ==================
  const verifySecurityCode = useCallback(async (): Promise<boolean> => {
    if (!correctionRequest || !securityCodeInput.trim()) {
      return false
    }

    const isValid = await registrationService.verifySecurityCode(
      correctionRequest.requestId,
      securityCodeInput.trim()
    )

    if (!isValid) {
      toast.error('Code invalide', {
        description: 'Le code de sécurité est incorrect, expiré ou déjà utilisé.',
        duration: 5000,
      })
      return false
    }

    // Charger les données de la demande
    const formData = await registrationService.loadRegistrationForCorrection(correctionRequest.requestId)
    if (!formData) {
      toast.error('Erreur de chargement', {
        description: 'Impossible de charger les données de la demande.',
        duration: 5000,
      })
      return false
    }

    // Réinitialiser le formulaire avec les données
    reset(formData)
    resetSteps()

    // Marquer comme vérifié
    setCorrectionRequest((prev) => (prev ? { ...prev, isVerified: true } : null))
    setSecurityCodeInput('')

    toast.success('Code vérifié !', {
      description: 'Vos données ont été chargées. Vous pouvez maintenant apporter les corrections.',
      duration: 4000,
    })

    return true
  }, [correctionRequest, securityCodeInput, registrationService, reset, resetSteps])

  // ================== UTILITAIRES ==================
  const resetForm = useCallback(() => {
    reset(defaultValues)
    resetSteps()
    setIsSubmitted(false)
    setSubmissionError(null)
    setUserData(undefined)
    cacheService.clearAll()
  }, [reset, resetSteps, cacheService])

  const clearCache = useCallback(() => {
    cacheService.clearAll()
  }, [cacheService])

  const hasCachedData = useCallback(() => {
    return cacheService.hasCachedData()
  }, [cacheService])

  const getStepData = useCallback(
    <T,>(step: keyof RegisterFormData): T => {
      return getValues(step) as T
    },
    [getValues]
  )

  return {
    // Formulaire
    form,

    // État
    currentStep,
    totalSteps,
    completedSteps,
    isLoading,
    isSubmitting,
    isCacheLoaded,
    isSubmitted,
    submissionError,
    userData,
    correctionRequest,
    securityCodeInput,

    // Navigation
    nextStep,
    prevStep,
    goToStep,

    // Validation
    validateCurrentStep,
    validateStep,

    // Soumission
    submitForm,
    resetForm,

    // Cache
    clearCache,
    hasCachedData,

    // Corrections
    verifySecurityCode,
    setSecurityCodeInput,

    // Utilitaires
    isStepCompleted,
    getProgress,
    getStepData,
  }
}
