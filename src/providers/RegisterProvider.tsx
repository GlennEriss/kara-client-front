'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  RegisterFormData,
  registerSchema,
  stepSchemas,
  defaultValues
} from '@/types/schemas'
import { createMembershipRequest } from '@/db/membership.db'
import { toast } from "sonner"

// ================== CONSTANTES DE CACHE ==================
const CACHE_KEYS = {
  FORM_DATA: 'register-form-data',
  CURRENT_STEP: 'register-current-step',
  COMPLETED_STEPS: 'register-completed-steps',
  TIMESTAMP: 'register-cache-timestamp'
} as const

const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 jours en millisecondes
const DEBOUNCE_DELAY = 500 // 500ms de délai pour la sauvegarde automatique

// ================== TYPES ==================
export interface StepErrors {
  [key: string]: string | undefined
}

export interface FormErrors {
  identity: StepErrors
  address: StepErrors
  company: StepErrors
  insurance: StepErrors
}

export interface RegisterContextType {
  // État des étapes
  currentStep: number
  totalSteps: number
  completedSteps: Set<number>

  // Form hook
  form: ReturnType<typeof useForm<RegisterFormData>>

  // États de l'interface
  isLoading: boolean
  isSubmitting: boolean
  isCacheLoaded: boolean
  isSubmitted: boolean
  submissionError: string | null
  userData?: {
    firstName?: string
    lastName?: string
  }

  // Fonctions de navigation
  nextStep: () => Promise<boolean>
  prevStep: () => void
  goToStep: (step: number) => void

  // Fonctions de validation
  validateCurrentStep: () => Promise<boolean>
  validateStep: (step: number) => Promise<boolean>

  // Fonctions de cache
  saveToCache: () => void
  loadFromCache: () => boolean
  clearCache: () => void
  hasCachedData: () => boolean

  // Fonctions de soumission
  submitForm: () => Promise<void>
  resetForm: () => void

  // Utilitaires
  isStepCompleted: (step: number) => boolean
  getStepProgress: () => number
  getStepData: <T>(step: keyof RegisterFormData) => T
}

// ================== UTILITAIRES DE CACHE ==================
class CacheManager {
  static isExpired(): boolean {
    const timestamp = localStorage.getItem(CACHE_KEYS.TIMESTAMP)
    if (!timestamp) return true

    const savedTime = parseInt(timestamp, 10)
    return Date.now() - savedTime > CACHE_EXPIRY
  }

  static saveFormData(data: Partial<RegisterFormData>): void {
    try {
      localStorage.setItem(CACHE_KEYS.FORM_DATA, JSON.stringify(data))
      localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString())
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde du cache:', error)
    }
  }

  static loadFormData(): Partial<RegisterFormData> | null {
    try {
      if (this.isExpired()) {
        this.clearAll()
        return null
      }

      const data = localStorage.getItem(CACHE_KEYS.FORM_DATA)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.warn('Erreur lors du chargement du cache:', error)
      this.clearAll()
      return null
    }
  }

  static saveCurrentStep(step: number): void {
    localStorage.setItem(CACHE_KEYS.CURRENT_STEP, step.toString())
  }

  static loadCurrentStep(): number {
    const step = localStorage.getItem(CACHE_KEYS.CURRENT_STEP)
    return step ? parseInt(step, 10) : 1
  }

  static saveCompletedSteps(steps: Set<number>): void {
    localStorage.setItem(CACHE_KEYS.COMPLETED_STEPS, JSON.stringify([...steps]))
  }

  static loadCompletedSteps(): Set<number> {
    try {
      const steps = localStorage.getItem(CACHE_KEYS.COMPLETED_STEPS)
      return steps ? new Set(JSON.parse(steps)) : new Set()
    } catch {
      return new Set()
    }
  }

  static clearAll(): void {
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }

  static hasCachedData(): boolean {
    return !this.isExpired() && !!localStorage.getItem(CACHE_KEYS.FORM_DATA)
  }
}

// ================== CONTEXTE ==================
const RegisterContext = createContext<RegisterContextType | undefined>(undefined)

// ================== PROVIDER ==================
interface RegisterProviderProps {
  children: ReactNode
}

export function RegisterProvider({ children }: RegisterProviderProps): React.JSX.Element {
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCacheLoaded, setIsCacheLoaded] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [userData, setUserData] = useState<{ firstName?: string; lastName?: string } | undefined>(undefined)

  const totalSteps = 4
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Configuration du formulaire avec react-hook-form
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues,
    mode: 'onChange'
  })

  const { watch, formState, trigger, getValues, setValue, reset } = form

  // ================== CHARGEMENT INITIAL DU CACHE ==================
  useEffect(() => {
    const loadCachedData = () => {
      setIsLoading(true)

      try {
        // Charger les données du formulaire
        const cachedData = CacheManager.loadFormData()
        if (cachedData) {
          // Merger les données cachées avec les valeurs par défaut
          const mergedData = { ...defaultValues, ...cachedData }
          reset(mergedData)
        }

        // Charger l'étape actuelle
        const cachedStep = CacheManager.loadCurrentStep()
        setCurrentStep(cachedStep)

        // Charger les étapes complétées
        const cachedCompletedSteps = CacheManager.loadCompletedSteps()
        setCompletedSteps(cachedCompletedSteps)

        setIsCacheLoaded(true)
      } catch (error) {
        console.warn('Erreur lors du chargement du cache:', error)
        CacheManager.clearAll()
      } finally {
        setIsLoading(false)
      }
    }

    loadCachedData()
  }, [reset])

  // ================== SAUVEGARDE AUTOMATIQUE ==================
  const debouncedSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      if (isCacheLoaded) {
        const currentData = getValues()
        CacheManager.saveFormData(currentData)
        CacheManager.saveCurrentStep(currentStep)
        CacheManager.saveCompletedSteps(completedSteps)
      }
    }, DEBOUNCE_DELAY)
  }, [getValues, currentStep, completedSteps, isCacheLoaded])

  // Surveiller les changements du formulaire pour sauvegarder
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

  // ================== FONCTIONS DE VALIDATION ==================
  const validateStep = useCallback(async (step: number): Promise<boolean> => {
    // Mapping correct step -> section du formulaire
    const stepToSectionMap = {
      1: 'identity',
      2: 'address',
      3: 'company',
      4: 'insurance'
    } as const

    const sectionKey = stepToSectionMap[step as keyof typeof stepToSectionMap] as keyof RegisterFormData
    const schema = stepSchemas[step as keyof typeof stepSchemas]

    try {
      const stepData = getValues(sectionKey)
      await schema.parseAsync(stepData)
      return true
    } catch (error) {
      console.warn(`Erreur de validation step ${step}:`, error)
      console.warn('Données du step:', getValues(sectionKey))
      return false
    }
  }, [getValues])

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    // Mapping step -> section
    const stepToSectionMap = {
      1: 'identity',
      2: 'address',
      3: 'company',
      4: 'insurance'
    } as const

    const sectionKey = stepToSectionMap[currentStep as keyof typeof stepToSectionMap]

    try {
      // Valider uniquement la section actuelle avec react-hook-form
      const isFormValid = await trigger(sectionKey)

      // Valider avec le schéma Zod
      const isSchemaValid = await validateStep(currentStep)

      console.log(`Validation step ${currentStep}:`, {
        sectionKey,
        isFormValid,
        isSchemaValid,
        formErrors: formState.errors[sectionKey],
        data: getValues(sectionKey)
      })

      return isFormValid && isSchemaValid
    } catch (error) {
      console.error('Erreur validation step actuel:', error)
      return false
    }
  }, [trigger, validateStep, currentStep, formState.errors, getValues])

  // ================== NAVIGATION ==================
  const nextStep = useCallback(async (): Promise<boolean> => {
    const isValid = await validateCurrentStep()

    if (isValid && currentStep < totalSteps) {
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      setCurrentStep(prev => prev + 1)
      return true
    }

    return false
  }, [currentStep, totalSteps, validateCurrentStep])

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step)
    }
  }, [totalSteps])

  // ================== GESTION DU CACHE ==================
  const saveToCache = useCallback(() => {
    const currentData = getValues()
    CacheManager.saveFormData(currentData)
    CacheManager.saveCurrentStep(currentStep)
    CacheManager.saveCompletedSteps(completedSteps)
  }, [getValues, currentStep, completedSteps])

  const loadFromCache = useCallback((): boolean => {
    const cachedData = CacheManager.loadFormData()
    if (cachedData) {
      const mergedData = { ...defaultValues, ...cachedData }
      reset(mergedData)
      setCurrentStep(CacheManager.loadCurrentStep())
      setCompletedSteps(CacheManager.loadCompletedSteps())
      return true
    }
    return false
  }, [reset])

  const clearCache = useCallback(() => {
    CacheManager.clearAll()
    setCompletedSteps(new Set())
    setCurrentStep(1)
  }, [])

  const hasCachedData = useCallback(() => {
    return CacheManager.hasCachedData()
  }, [])

  // ================== SOUMISSION ==================
  const submitForm = useCallback(async () => {
    setIsSubmitting(true)
    setIsLoading(true)
    setSubmissionError(null) // Nettoyer les erreurs précédentes

    try {
      // Valider le formulaire complet
      const isValid = await trigger()
      if (!isValid) {
        throw new Error('Le formulaire contient des erreurs')
      }

      const formData = getValues()

      const membershipRequestId = await createMembershipRequest(formData)

      if (!membershipRequestId) {
        throw new Error('Échec de l\'enregistrement de la demande d\'adhésion')
      }

      // Succès - afficher toast de succès et nettoyer le cache
      toast.success("Inscription réussie !", {
        description: "Votre demande d'adhésion a été enregistrée avec succès.",
        style: {
          background: '#10B981',
          color: 'white',
          border: 'none'
        },
        duration: 4000
      })

      clearCache()
      setIsSubmitted(true)
      setUserData({
        firstName: getValues('identity.firstName'),
        lastName: getValues('identity.lastName')
      })
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error)
      
      // Stocker l'erreur pour l'affichage
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Une erreur inattendue s\'est produite lors de l\'enregistrement'
      setSubmissionError(errorMessage)

      // Afficher toast d'erreur
      toast.error("Échec de l'inscription", {
        description: errorMessage,
        style: {
          background: '#EF4444',
          color: 'white',
          border: 'none'
        },
        duration: 5000
      })
      
      throw error
    } finally {
      setIsSubmitting(false)
      setIsLoading(false)
    }
  }, [trigger, getValues, clearCache])

  // ================== RESET ==================
  const resetForm = useCallback(() => {
    reset(defaultValues)
    setCurrentStep(1)
    setCompletedSteps(new Set())
    setIsSubmitted(false)
    setSubmissionError(null)
    setUserData(undefined)
    clearCache()
  }, [reset, clearCache])

  // ================== UTILITAIRES ==================
  const isStepCompleted = useCallback((step: number): boolean => {
    return completedSteps.has(step)
  }, [completedSteps])

  const getStepProgress = useCallback((): number => {
    return (completedSteps.size / totalSteps) * 100
  }, [completedSteps, totalSteps])

  const getStepData = useCallback(function <T>(step: keyof RegisterFormData): T {
    return getValues(step) as T
  }, [getValues])

  // ================== VALEUR DU CONTEXTE ==================
  const contextValue: RegisterContextType = {
    currentStep,
    totalSteps,
    completedSteps,
    form,
    isLoading,
    isSubmitting,
    isCacheLoaded,
    isSubmitted,
    submissionError,
    userData,
    nextStep,
    prevStep,
    goToStep,
    validateCurrentStep,
    validateStep,
    saveToCache,
    loadFromCache,
    clearCache,
    hasCachedData,
    submitForm,
    resetForm,
    isStepCompleted,
    getStepProgress,
    getStepData,
  }

  return (
    <RegisterContext.Provider value={contextValue}>
      {children}
    </RegisterContext.Provider>
  )
}

// ================== HOOK PERSONNALISÉ ==================
export function useRegister(): RegisterContextType {
  const context = useContext(RegisterContext)

  if (context === undefined) {
    throw new Error('useRegister must be used within a RegisterProvider')
  }

  return context
} 