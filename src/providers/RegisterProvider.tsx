'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  RegisterFormData,
  registerSchema,
  stepSchemas,
  defaultValues
} from '@/schemas/schemas'
import { getMembershipRequestById, markSecurityCodeAsUsed } from '@/db/membership.db'
import { MembershipFormService } from '@/domains/memberships/services/MembershipFormService'
import { toast } from "sonner"
import { CompanyFormMediatorFactory } from '@/factories/CompanyFormMediatorFactory'
import { CompanyFormMediator } from '@/mediators/CompanyFormMediator'

// ================== CONSTANTES DE CACHE ==================
const CACHE_KEYS = {
  FORM_DATA: 'register-form-data',
  CURRENT_STEP: 'register-current-step',
  COMPLETED_STEPS: 'register-completed-steps',
  TIMESTAMP: 'register-cache-timestamp',
  MEMBERSHIP_ID: 'register-membership-id',
  SUBMISSION_TIMESTAMP: 'register-submission-timestamp',
  VERSION: 'register-cache-version'
} as const

const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24h en millisecondes (réduit de 7 jours)
const SUBMISSION_CACHE_EXPIRY = 48 * 60 * 60 * 1000 // 48h pour l'état submitted
const DEBOUNCE_DELAY = 500 // 500ms de délai pour la sauvegarde automatique
const CACHE_VERSION = '2' // Version du cache pour forcer la migration

// ================== TYPES ==================
export interface StepErrors {
  [key: string]: string | undefined
}

export interface FormErrors {
  identity: StepErrors
  address: StepErrors
  company: StepErrors
  documents: StepErrors
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

  // États de correction
  correctionRequest: {
    requestId: string;
    reviewNote: string;
    securityCode: string;
    isVerified: boolean;
  } | null
  securityCodeInput: string

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

  // Fonctions de correction
  verifySecurityCode: () => Promise<boolean>
  setSecurityCodeInput: (code: string) => void

  // Utilitaires
  isStepCompleted: (step: number) => boolean
  getStepProgress: () => number
  getStepData: <T>(step: keyof RegisterFormData) => T
  checkMembershipStatus: () => Promise<boolean>
  mediatorStep3: CompanyFormMediator
}

// ================== UTILITAIRES DE CACHE ==================
class CacheManager {
  static isExpired(): boolean {
    const timestamp = localStorage.getItem(CACHE_KEYS.TIMESTAMP)
    if (!timestamp) return true

    const savedTime = parseInt(timestamp, 10)
    return Date.now() - savedTime > CACHE_EXPIRY
  }

  static isSubmissionExpired(): boolean {
    const timestamp = localStorage.getItem(CACHE_KEYS.SUBMISSION_TIMESTAMP)
    if (!timestamp) return true

    const savedTime = parseInt(timestamp, 10)
    return Date.now() - savedTime > SUBMISSION_CACHE_EXPIRY
  }

  static saveFormData(data: Partial<RegisterFormData>): void {
    try {
      // Nettoyer les données avant de sauvegarder
      const cleanData = { ...data }
      if ('insurance' in cleanData) {
        delete (cleanData as any).insurance
      }

      localStorage.setItem(CACHE_KEYS.FORM_DATA, JSON.stringify(cleanData))
      localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString())
      localStorage.setItem(CACHE_KEYS.VERSION, CACHE_VERSION)
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

      // Vérifier la version du cache
      const cachedVersion = localStorage.getItem(CACHE_KEYS.VERSION)
      if (cachedVersion !== CACHE_VERSION) {
        console.warn('Version du cache obsolète, nettoyage en cours...')
        this.clearAll()
        return null
      }

      const data = localStorage.getItem(CACHE_KEYS.FORM_DATA)
      if (data) {
        const parsedData = JSON.parse(data)
        // Nettoyer les données obsolètes (insurance)
        if (parsedData.insurance) {
          delete parsedData.insurance
          console.warn('Suppression de la section insurance obsolète du cache')
        }
        return parsedData
      }
      return null
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

  // Nouvelles méthodes pour gérer l'état submitted
  static saveSubmissionData(membershipId: string, userData: { firstName?: string; lastName?: string; civility?: string }): void {
    try {
      localStorage.setItem(CACHE_KEYS.MEMBERSHIP_ID, membershipId)
      localStorage.setItem(CACHE_KEYS.SUBMISSION_TIMESTAMP, Date.now().toString())
      // Sauvegarder aussi les données utilisateur pour Step5
      localStorage.setItem('register-user-data', JSON.stringify(userData))
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde des données de soumission:', error)
    }
  }

  static loadSubmissionData(): { membershipId: string; userData: { firstName?: string; lastName?: string; civility?: string } } | null {
    try {
      if (this.isSubmissionExpired()) {
        this.clearSubmissionData()
        return null
      }

      const membershipId = localStorage.getItem(CACHE_KEYS.MEMBERSHIP_ID)
      const userData = localStorage.getItem('register-user-data')

      if (membershipId && userData) {
        return {
          membershipId,
          userData: JSON.parse(userData)
        }
      }
      return null
    } catch (error) {
      console.warn('Erreur lors du chargement des données de soumission:', error)
      this.clearSubmissionData()
      return null
    }
  }

  static clearSubmissionData(): void {
    localStorage.removeItem(CACHE_KEYS.MEMBERSHIP_ID)
    localStorage.removeItem(CACHE_KEYS.SUBMISSION_TIMESTAMP)
    localStorage.removeItem('register-user-data')
  }

  static hasValidSubmission(): boolean {
    return !this.isSubmissionExpired() && !!localStorage.getItem(CACHE_KEYS.MEMBERSHIP_ID)
  }

  static clearAll(): void {
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
    localStorage.removeItem('register-user-data')
  }

  static clearFormDataOnly(): void {
    localStorage.removeItem(CACHE_KEYS.FORM_DATA)
    localStorage.removeItem(CACHE_KEYS.TIMESTAMP)
    localStorage.removeItem(CACHE_KEYS.CURRENT_STEP)
    localStorage.removeItem(CACHE_KEYS.COMPLETED_STEPS)
  }

  static hasCachedData(): boolean {
    return !this.isExpired() && !!localStorage.getItem(CACHE_KEYS.FORM_DATA)
  }
}

// ================== CONTEXTE ==================
const RegisterContext = createContext<RegisterContextType | undefined>(undefined)
export const useRegisterContext = () => {
  const context = useContext(RegisterContext)
  if (!context) {
    throw new Error('useRegisterContext must be used within a RegisterProvider')
  }
  return context
}
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
  const [userData, setUserData] = useState<{ firstName?: string; lastName?: string; civility?: string } | undefined>(undefined)
  const [correctionRequest, setCorrectionRequest] = useState<{
    requestId: string;
    reviewNote: string;
    securityCode: string;
    isVerified: boolean;
  } | null>(null)
  const [securityCodeInput, setSecurityCodeInput] = useState<string>('')

  const totalSteps = 4
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  
  // Instance du service centralisé
  const formService = MembershipFormService.getInstance()

  // Configuration du formulaire avec react-hook-form
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues,
    mode: 'onChange'
  })
  const mediatorStep3 = CompanyFormMediatorFactory.create(form)
  const { watch, formState, trigger, getValues, setValue, reset, setError } = form

  // ================== CHARGEMENT INITIAL DU CACHE ==================
  useEffect(() => {
    const loadCachedData = async () => {
      setIsLoading(true)

      try {
        // Vérifier d'abord s'il y a un requestId dans l'URL pour les corrections (PRIORITÉ MAXIMALE)
        const urlParams = new URLSearchParams(window.location.search)
        const requestId = urlParams.get('requestId')

        if (requestId) {
          console.log('🔍 Demande de correction détectée:', requestId)
          try {
            const request = await getMembershipRequestById(requestId)
            if (request && request.reviewNote && request.securityCode) {
              // Vérifier si le code a déjà été utilisé
              if (request.securityCodeUsed) {
                console.warn('⚠️ Code de sécurité déjà utilisé')
                toast.error('Code déjà utilisé', {
                  description: 'Ce code de sécurité a déjà été utilisé. Veuillez demander un nouveau code à l\'administrateur.',
                  duration: 5000,
                })
                setIsCacheLoaded(true)
                setIsLoading(false)
                return
              }

              // Vérifier l'expiration du code de sécurité
              const expiry = request.securityCodeExpiry ? ((request.securityCodeExpiry as any)?.toDate ? (request.securityCodeExpiry as any).toDate() : new Date(request.securityCodeExpiry)) : null;
              const isExpired = expiry ? expiry < new Date() : true;

              if (isExpired) {
                console.warn('⚠️ Code de sécurité expiré')
                toast.error('Code expiré', {
                  description: 'Le code de sécurité a expiré. Veuillez demander un nouveau code à l\'administrateur.',
                  duration: 5000,
                })
                setIsCacheLoaded(true)
                setIsLoading(false)
                return
              }

              // Demande avec corrections trouvée et code valide - NETTOYER LE CACHE DE SOUMISSION
              console.log('🧹 Nettoyage du cache de soumission pour prioriser la correction')
              CacheManager.clearSubmissionData()

              setCorrectionRequest({
                requestId: request.id,
                reviewNote: request.reviewNote,
                securityCode: request.securityCode,
                isVerified: false
              })
              console.log('✅ Demande de correction chargée, en attente du code de sécurité')
              setIsCacheLoaded(true)
              setIsLoading(false)
              return
            } else {
              // Demande trouvée mais sans corrections ou code de sécurité
              console.warn('⚠️ Demande trouvée mais sans corrections ou code de sécurité')
              toast.error('Demande invalide', {
                description: 'Cette demande ne nécessite pas de corrections ou le code de sécurité est manquant.',
                duration: 5000,
              })
            }
          } catch (error) {
            console.error('Erreur lors de la récupération de la demande:', error)
            toast.error('Erreur de chargement', {
              description: 'Impossible de charger la demande de correction.',
              duration: 5000,
            })
          }
        }

        // Vérifier ensuite s'il y a une soumission valide (priorité secondaire)
        // IMPORTANT: Ne vérifier que si on n'a pas de requestId dans l'URL
        // Si on arrive sur /memberships/add sans requestId, c'est qu'on veut créer une nouvelle demande
        // Il faut donc nettoyer le cache de soumission pour permettre la création d'une nouvelle demande
        const submissionData = CacheManager.loadSubmissionData()
        if (submissionData && !requestId) {
          // On arrive sur /memberships/add sans requestId = nouvelle demande
          // Nettoyer le cache de soumission pour permettre la création
          console.log('🧹 Nettoyage du cache de soumission pour permettre la création d\'une nouvelle demande')
          CacheManager.clearSubmissionData()
        } else if (submissionData && requestId) {
          // On a un requestId ET des données de soumission = on continue avec la vérification normale
          // Vérifier si le document existe encore dans Firestore
          console.log('🔍 Vérification de l\'existence du membership:', submissionData.membershipId)
          try {
            const membershipExists = await getMembershipRequestById(submissionData.membershipId)
            if (membershipExists) {
              // Le document existe encore, afficher Step5
              console.log('✅ Membership confirmé dans Firestore')
              setIsSubmitted(true)
              setUserData(submissionData.userData)
              setIsCacheLoaded(true)
              setIsLoading(false)
              return
            } else {
              // Le document n'existe plus, nettoyer le cache
              console.warn('❌ Membership supprimé de Firestore, nettoyage du cache')
              CacheManager.clearSubmissionData()
              // Continuer avec le chargement normal du formulaire
            }
          } catch (error) {
            console.error('Erreur lors de la vérification du membership:', error)
            // En cas d'erreur, on nettoie le cache par sécurité
            CacheManager.clearSubmissionData()
          }
        }

        // Vérifier et nettoyer les données obsolètes du cache
        const cachedVersion = localStorage.getItem(CACHE_KEYS.VERSION)
        if (cachedVersion !== CACHE_VERSION) {
          console.warn('🔄 Migration du cache en cours - Ancien schéma détecté')
          CacheManager.clearAll()
        }

        // Sinon, charger les données du formulaire normalement
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
        // Sauvegarder via le service centralisé (brouillon)
        formService.saveDraft(currentData)
        // Garder aussi le CacheManager pour la compatibilité (étapes, progression)
        CacheManager.saveFormData(currentData)
        CacheManager.saveCurrentStep(currentStep)
        CacheManager.saveCompletedSteps(completedSteps)
      }
    }, DEBOUNCE_DELAY)
  }, [getValues, currentStep, completedSteps, isCacheLoaded, formService])

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
      4: 'documents'
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
      4: 'documents'
    } as const

    const sectionKey = stepToSectionMap[currentStep as keyof typeof stepToSectionMap]

    try {
      // Forcer une validation complète avec react-hook-form
      const isFormValid = await trigger(sectionKey)

      // Valider avec le schéma Zod de manière plus stricte
      const stepData = getValues(sectionKey)
      const schema = stepSchemas[currentStep as keyof typeof stepSchemas]

      try {
        await schema.parseAsync(stepData)
        const isSchemaValid = true
      } catch (schemaError) {
        console.warn(`Erreur de validation Zod step ${currentStep}:`, schemaError)
        // Si le schéma Zod échoue, forcer les erreurs dans react-hook-form
        if (schemaError instanceof Error) {
          // Extraire les erreurs du schéma Zod et les appliquer
          const zodErrors = (schemaError as any).errors || []
          zodErrors.forEach((error: any) => {
            const fieldPath = error.path.join('.')
            setError(`${sectionKey}.${fieldPath}` as any, {
              type: 'manual',
              message: error.message
            })
          })
        }
        const isSchemaValid = false
      }

      console.log(`Validation step ${currentStep}:`, {
        sectionKey,
        isFormValid,
        stepData,
        formErrors: formState.errors[sectionKey]
      })

      // Retourner true seulement si les deux validations passent
      return isFormValid && Object.keys(formState.errors[sectionKey] || {}).length === 0
    } catch (error) {
      console.error('Erreur validation step actuel:', error)
      return false
    }
  }, [trigger, currentStep, formState.errors, getValues, setError])

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
    // Sauvegarder via le service centralisé (brouillon)
    formService.saveDraft(currentData)
    // Garder aussi le CacheManager pour la compatibilité (étapes, progression)
    CacheManager.saveFormData(currentData)
    CacheManager.saveCurrentStep(currentStep)
    CacheManager.saveCompletedSteps(completedSteps)
  }, [getValues, currentStep, completedSteps, formService])

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
    setIsSubmitted(false)
    setUserData(undefined)
  }, [])

  const hasCachedData = useCallback(() => {
    return CacheManager.hasCachedData()
  }, [])

  // ================== UTILITAIRES D'IDENTITÉ ==================
  const getIdentityDetails = useCallback(() => {
    const civility = getValues('identity.civility')?.trim() || ''
    const firstName = getValues('identity.firstName')?.trim() || ''
    const lastName = getValues('identity.lastName')?.trim() || ''

    return {
      civility,
      firstName,
      lastName,
      displayName: [civility, firstName, lastName].filter(Boolean).join(' ') || 'Utilisateur'
    }
  }, [getValues])

  // ================== SOUMISSION ==================
  const submitForm = useCallback(async () => {
    setIsSubmitting(true)
    setIsLoading(true)
    setSubmissionError(null) // Nettoyer les erreurs précédentes

    try {
      // Nettoyer les données avant validation
      const currentData = getValues()
      console.log('currentData', currentData)
      if ('insurance' in currentData) {
        console.warn('Suppression de la section insurance obsolète des données du formulaire')
        delete (currentData as any).insurance
        // Réinitialiser le formulaire avec les données nettoyées
        reset({ ...defaultValues, ...currentData })
      }

      const formData = getValues()

      // Vérifier si c'est une correction ou une nouvelle demande
      if (correctionRequest?.isVerified && securityCodeInput.trim()) {
        // Mise à jour d'une demande existante (correction)
        console.log('🔄 Mise à jour de la demande de correction:', correctionRequest.requestId)

        const result = await formService.submitCorrection(
          formData,
          correctionRequest.requestId,
          securityCodeInput.trim()
        )

        if (!result.success) {
          throw new Error(result.error || 'Échec de la mise à jour de la demande d\'adhésion')
        }

        // Succès - nettoyer le cache et afficher le message de succès
        const userData = {
          firstName: getValues('identity.firstName'),
          lastName: getValues('identity.lastName'),
          civility: getValues('identity.civility')
        }

        // Vider le cache des données du formulaire
        CacheManager.clearFormDataOnly()

        // Sauvegarder l'ID du membership et les données utilisateur pour 48h
        CacheManager.saveSubmissionData(correctionRequest.requestId, userData)

        // Afficher toast de succès pour correction
        const { displayName } = getIdentityDetails()

        toast.success("Corrections soumises !", {
          description: `Demande soumise avec succès ${displayName}`,
          style: {
            background: '#10B981',
            color: 'white',
            border: 'none'
          },
          duration: 4000
        })

        setIsSubmitted(true)
        setUserData(userData)
        setCorrectionRequest(null) // Nettoyer les données de correction
        setSecurityCodeInput('') // Nettoyer le code de sécurité
      } else {
        // Nouvelle demande
        const result = await formService.submitNewMembership(formData)

        if (!result.success || !result.requestId) {
          throw new Error(result.error || 'Échec de l\'enregistrement de la demande d\'adhésion')
        }

        console.log('membershipRequestId', result.requestId)

        // Succès - sauvegarder les données de soumission et nettoyer le cache du formulaire
        const userData = {
          firstName: getValues('identity.firstName'),
          lastName: getValues('identity.lastName'),
          civility: getValues('identity.civility')
        }

        // Vider le cache des données du formulaire
        CacheManager.clearFormDataOnly()

        // Sauvegarder l'ID du membership et les données utilisateur pour 48h
        CacheManager.saveSubmissionData(result.requestId, userData)

        // Afficher toast de succès
        const { displayName } = getIdentityDetails()

        toast.success("Inscription réussie !", {
          description: `Demande soumise avec succès ${displayName}`,
          style: {
            background: '#10B981',
            color: 'white',
            border: 'none'
          },
          duration: 4000
        })

        setIsSubmitted(true)
        setUserData(userData)
      }
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
  }, [trigger, getValues, reset, correctionRequest, securityCodeInput, getIdentityDetails, formService])

  // ================== RESET ==================
  const resetForm = useCallback(() => {
    reset(defaultValues)
    setCurrentStep(1)
    setCompletedSteps(new Set())
    setIsSubmitted(false)
    setSubmissionError(null)
    setUserData(undefined)
    CacheManager.clearAll() // Nettoie tout, y compris les données de soumission
  }, [reset])

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

  // ================== GESTION DES CORRECTIONS ==================

  // Fonction pour nettoyer le cache de soumission quand on accède aux corrections
  const clearSubmissionCacheForCorrections = useCallback(() => {
    console.log('🧹 Nettoyage du cache de soumission pour permettre les corrections')
    CacheManager.clearSubmissionData()
    setIsSubmitted(false)
    setUserData(undefined)
  }, [])

  const verifySecurityCode = useCallback(async (): Promise<boolean> => {
    if (!correctionRequest || !securityCodeInput.trim()) {
      return false
    }

    if (securityCodeInput.trim() === correctionRequest.securityCode) {
      try {
        // Code correct, vérifier l'expiration avant de charger les données
        const request = await getMembershipRequestById(correctionRequest.requestId)
        if (!request) {
          toast.error('Demande introuvable', {
            description: 'La demande de correction n\'a pas été trouvée.',
            duration: 5000,
          })
          return false
        }

        // Vérifier si le code a déjà été utilisé
        if (request.securityCodeUsed) {
          toast.error('Code déjà utilisé', {
            description: 'Ce code de sécurité a déjà été utilisé. Veuillez demander un nouveau code à l\'administrateur.',
            duration: 5000,
          })
          return false
        }

        // Vérifier l'expiration du code
        const expiry = request.securityCodeExpiry ? ((request.securityCodeExpiry as any)?.toDate ? (request.securityCodeExpiry as any).toDate() : new Date(request.securityCodeExpiry)) : null;
        const isExpired = expiry ? expiry < new Date() : true;

        if (isExpired) {
          toast.error('Code expiré', {
            description: 'Le code de sécurité a expiré. Veuillez demander un nouveau code à l\'administrateur.',
            duration: 5000,
          })
          return false
        }

        // Code valide, charger les données de la demande
        if (request) {
          // Convertir les données de la demande en format RegisterFormData
          const formData: RegisterFormData = {
            identity: {
              civility: request.identity.civility,
              lastName: request.identity.lastName,
              firstName: request.identity.firstName,
              birthDate: request.identity.birthDate,
              birthPlace: request.identity.birthPlace,
              birthCertificateNumber: request.identity.birthCertificateNumber,
              prayerPlace: request.identity.prayerPlace,
              religion: request.identity.religion,
              contacts: request.identity.contacts,
              email: request.identity.email,
              gender: request.identity.gender,
              nationality: request.identity.nationality,
              maritalStatus: request.identity.maritalStatus,
              spouseLastName: request.identity.spouseLastName,
              spouseFirstName: request.identity.spouseFirstName,
              spousePhone: request.identity.spousePhone,
              intermediaryCode: request.identity.intermediaryCode,
              hasCar: request.identity.hasCar,
              photo: request.identity.photo,
              photoURL: request.identity.photoURL,
              photoPath: request.identity.photoPath,
            },
            address: request.address,
            company: request.company,
            documents: {
              identityDocument: request.documents.identityDocument,
              identityDocumentNumber: request.documents.identityDocumentNumber,
              documentPhotoFront: request.documents.documentPhotoFront,
              documentPhotoBack: request.documents.documentPhotoBack,
              expirationDate: request.documents.expirationDate,
              issuingPlace: request.documents.issuingPlace,
              issuingDate: request.documents.issuingDate,
              documentPhotoFrontURL: request.documents.documentPhotoFrontURL,
              documentPhotoFrontPath: request.documents.documentPhotoFrontPath,
              documentPhotoBackURL: request.documents.documentPhotoBackURL,
              documentPhotoBackPath: request.documents.documentPhotoBackPath,
              termsAccepted: request.documents.termsAccepted ?? false,
            }
          }

          // Réinitialiser le formulaire avec les données de la demande
          reset(formData)
          setCurrentStep(1)
          setCompletedSteps(new Set())

          // Marquer le code comme utilisé dans la base de données
          await markSecurityCodeAsUsed(correctionRequest.requestId)

          // Marquer comme vérifié
          setCorrectionRequest(prev => prev ? { ...prev, isVerified: true } : null)
          setSecurityCodeInput('')

          toast.success('Code vérifié !', {
            description: 'Vos données ont été chargées. Vous pouvez maintenant apporter les corrections demandées.',
            duration: 4000,
          })

          return true
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données de correction:', error)
        toast.error('Erreur de chargement', {
          description: 'Impossible de charger vos données de correction.',
          duration: 5000,
        })
      }
    } else {
      toast.error('Code incorrect', {
        description: 'Le code de sécurité saisi ne correspond pas.',
        duration: 3000,
      })
    }

    return false
  }, [correctionRequest, securityCodeInput, reset])

  // ================== VÉRIFICATION DU STATUT ==================
  const checkMembershipStatus = useCallback(async (): Promise<boolean> => {
    const submissionData = CacheManager.loadSubmissionData()
    if (!submissionData) {
      return false
    }

    try {
      console.log('🔍 Vérification manuelle du statut du membership:', submissionData.membershipId)
      const membershipExists = await getMembershipRequestById(submissionData.membershipId)

      if (!membershipExists) {
        console.warn('❌ Membership non trouvé, retour au formulaire')
        CacheManager.clearSubmissionData()
        setIsSubmitted(false)
        setUserData(undefined)
        setCurrentStep(1)

        toast.error("Demande introuvable", {
          description: "Votre demande d'adhésion n'a pas été trouvée. Veuillez soumettre une nouvelle demande.",
          style: {
            background: '#EF4444',
            color: 'white',
            border: 'none'
          },
          duration: 5000
        })

        return false
      }

      console.log('✅ Membership confirmé')
      return true
    } catch (error) {
      console.error('Erreur lors de la vérification:', error)
      toast.error("Erreur de vérification", {
        description: "Impossible de vérifier le statut de votre demande.",
        style: {
          background: '#EF4444',
          color: 'white',
          border: 'none'
        },
        duration: 3000
      })
      return false
    }
  }, [setIsSubmitted, setUserData, setCurrentStep])

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
    correctionRequest,
    securityCodeInput,
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
    verifySecurityCode,
    setSecurityCodeInput,
    isStepCompleted,
    getStepProgress,
    getStepData,
    checkMembershipStatus,
    mediatorStep3
  }

  return (
    <RegisterContext.Provider value={contextValue}>
      <FormProvider {...form}>
        {children}
      </FormProvider>
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