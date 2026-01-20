'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { 
  ChevronLeft, 
  ChevronRight, 
  Send,
  Shield,
  Home,
  User,
  MapPin,
  Briefcase,
  FileText,
  Sparkles,
  RotateCcw,
  AlertTriangle
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { registerSchema, defaultValues, type RegisterFormData } from '@/domains/auth/registration/schemas/registration.schema'

// Services et repositories pour la soumission
import { RegistrationService } from '@/domains/auth/registration/services/RegistrationService'
import { RegistrationRepository } from '@/domains/auth/registration/repositories/RegistrationRepository'

import StepIndicatorV2 from './StepIndicatorV2'
import IdentityStepV2 from './steps/IdentityStepV2'
import AddressStepV2 from './steps/AddressStepV2'
import CompanyStepV2 from './steps/CompanyStepV2'
import DocumentsStepV2 from './steps/DocumentsStepV2'
import SuccessStepV2 from './steps/SuccessStepV2'
import { CorrectionBannerV2 } from '@/domains/memberships/components/shared/CorrectionBannerV2'
import { SecurityCodeFormV2 } from './SecurityCodeFormV2'
import { getMembershipRequestById } from '@/db/membership.db'

// Instancier le service d'inscription
const registrationRepository = new RegistrationRepository()
const registrationService = new RegistrationService(registrationRepository)

// Configuration des étapes
const STEPS = [
  { id: 1, key: 'identity', title: 'Identité', icon: User, color: 'from-blue-500 to-cyan-500' },
  { id: 2, key: 'address', title: 'Adresse', icon: MapPin, color: 'from-emerald-500 to-teal-500' },
  { id: 3, key: 'company', title: 'Profession', icon: Briefcase, color: 'from-amber-500 to-orange-500' },
  { id: 4, key: 'documents', title: 'Documents', icon: FileText, color: 'from-purple-500 to-pink-500' },
] as const

export default function RegistrationFormV2() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [submittedUserData, setSubmittedUserData] = useState<{
    firstName?: string
    lastName?: string
    civility?: string
  } | null>(null)
  
  // État pour le mode correction
  const [correctionRequest, setCorrectionRequest] = useState<{
    requestId: string
    reviewNote: string
    isVerified: boolean
    verifiedCode?: string // Stocker le code vérifié pour la soumission
  } | null>(null)
  const [isLoadingCorrection, setIsLoadingCorrection] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  const totalSteps = STEPS.length

  // Form setup avec react-hook-form
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: defaultValues as RegisterFormData,
    mode: 'onChange',
  })

  const { handleSubmit, trigger } = methods

  // Détecter le requestId dans l'URL et charger la demande de correction
  useEffect(() => {
    const loadCorrectionRequest = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const requestId = urlParams.get('requestId')

        if (requestId) {
          setIsLoadingCorrection(true)
          try {
            const request = await getMembershipRequestById(requestId)
            if (request?.reviewNote && request?.securityCode) {
              // Vérifier si le code est déjà utilisé
              if (request.securityCodeUsed) {
                toast.error('Code déjà utilisé', {
                  description: 'Ce code de sécurité a déjà été utilisé.',
                  duration: 5000,
                })
                setIsLoadingCorrection(false)
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
                setIsLoadingCorrection(false)
                return
              }

              setCorrectionRequest({
                requestId: request.id || requestId,
                reviewNote: request.reviewNote,
                isVerified: false,
              })
            }
          } catch (error) {
            console.error('[RegistrationFormV2] Erreur lors du chargement de la demande:', error)
            toast.error('Erreur', {
              description: 'Impossible de charger la demande de correction.',
              duration: 5000,
            })
          } finally {
            setIsLoadingCorrection(false)
          }
        }
      } catch (error) {
        console.error('[RegistrationFormV2] Erreur lors de la détection du requestId:', error)
      }
    }

    loadCorrectionRequest()
  }, [])

  // Vérifier si une demande a déjà été soumise avec succès au montage
  // MAIS seulement si on n'est pas en mode correction (pas de requestId dans l'URL)
  useEffect(() => {
    try {
      // Vérifier d'abord s'il y a un requestId dans l'URL (mode correction)
      // Si oui, ne pas charger les données de soumission
      const urlParams = new URLSearchParams(window.location.search)
      const requestId = urlParams.get('requestId')
      if (requestId) {
        // On est en mode correction, ne pas afficher l'écran de succès
        setIsSubmitted(false)
        setSubmittedUserData(null)
        return
      }

      const submittedData = localStorage.getItem('kara-register-submitted')
      if (submittedData) {
        const { userData, timestamp } = JSON.parse(submittedData)
        // Vérifier si le cache n'a pas expiré (7 jours)
        const weekInMs = 7 * 24 * 60 * 60 * 1000
        if (Date.now() - timestamp < weekInMs) {
          setIsSubmitted(true)
          setSubmittedUserData(userData || null)
          return // Ne pas charger les données du formulaire si une demande a été soumise
        } else {
          // Supprimer les données expirées
          localStorage.removeItem('kara-register-submitted')
        }
      }
    } catch {
      // Ignorer les erreurs de parsing
    }
  }, [])

  // Charger les données du cache au montage (une seule fois) - seulement si pas de demande soumise
  useEffect(() => {
    // Ne pas charger le formulaire si une demande a déjà été soumise
    if (isSubmitted) return

    let isMounted = true
    try {
      const cached = localStorage.getItem('kara-register-form-v2')
      if (cached && isMounted) {
        const { data, step, completed, timestamp } = JSON.parse(cached)
        // Vérifier si le cache n'a pas expiré (7 jours)
        const weekInMs = 7 * 24 * 60 * 60 * 1000
        if (Date.now() - timestamp < weekInMs) {
          // Utiliser setTimeout pour s'assurer que le formulaire est prêt
          setTimeout(() => {
            if (isMounted && !isSubmitted) {
              methods.reset(data)
              setCurrentStep(step || 1)
              setCompletedSteps(new Set(completed || []))
            }
          }, 100)
        }
      }
    } catch {
      // Ignorer les erreurs de parsing
    }
    return () => {
      isMounted = false
    }
  }, [isSubmitted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sauvegarder automatiquement dans le cache
  const saveToCache = useCallback(() => {
    try {
      const data = methods.getValues()
      localStorage.setItem('kara-register-form-v2', JSON.stringify({
        data,
        step: currentStep,
        completed: Array.from(completedSteps),
        timestamp: Date.now(),
      }))
    } catch {
      // Ignorer les erreurs de stockage
    }
  }, [methods, currentStep, completedSteps])

  // Auto-save avec debounce après chaque changement de valeur + intervalle de 30 secondes
  useEffect(() => {
    const interval = setInterval(saveToCache, 30000)
    
    // Debounce pour éviter trop de sauvegardes
    let debounceTimer: NodeJS.Timeout | null = null
    
    // Écouter les changements de valeurs du formulaire avec debounce
    const subscription = methods.watch(() => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      debounceTimer = setTimeout(() => {
        saveToCache()
      }, 1000) // Sauvegarder 1 seconde après le dernier changement
    })
    
    return () => {
      clearInterval(interval)
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      subscription.unsubscribe()
    }
  }, [saveToCache, methods])

  // Valider l'étape actuelle
  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    const stepKey = STEPS[currentStep - 1]?.key
    if (!stepKey) return false

    // Pour l'étape entreprise, si non employé, considérer comme valide
    if (stepKey === 'company') {
      const isEmployed = methods.getValues('company.isEmployed')
      if (!isEmployed) return true
    }

    const fieldsToValidate = stepKey as keyof RegisterFormData
    
    // Effacer d'abord les erreurs de l'étape pour éviter les erreurs "stale"
    methods.clearErrors(fieldsToValidate)
    
    // Déclencher la validation de l'étape avec shouldFocus pour montrer les erreurs
    const result = await trigger(fieldsToValidate, { shouldFocus: true })
    
    return result
  }, [currentStep, methods, trigger])

  // Aller à l'étape suivante
  const nextStep = useCallback(async (e?: React.MouseEvent<HTMLButtonElement>) => {
    // Empêcher la soumission du formulaire
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    const isValid = await validateCurrentStep()
    if (!isValid) return

    // Vérifier explicitement qu'on n'est pas à la dernière étape
    if (currentStep >= totalSteps) {
      return // Ne rien faire si on est déjà à la dernière étape
    }

    setCompletedSteps(prev => new Set([...prev, currentStep]))
    saveToCache()

    // Passer à l'étape suivante uniquement si on n'est pas à la dernière
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentStep, totalSteps, validateCurrentStep, saveToCache])

  // Aller à l'étape précédente
  const prevStep = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
    // Empêcher la soumission du formulaire
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentStep])

  // Vérifier le code de sécurité
  const handleVerifyCode = async (code: string): Promise<boolean> => {
    if (!correctionRequest) return false

    setCodeError(null)
    try {
      const result = await registrationService.verifySecurityCode(correctionRequest.requestId, code)

      if (!result.isValid) {
        const errorMessage = result.reason === 'CODE_INCORRECT'
          ? 'Le code de sécurité est incorrect.'
          : result.reason === 'CODE_EXPIRED'
          ? 'Le code de sécurité a expiré. Veuillez demander un nouveau code à l\'administrateur.'
          : result.reason === 'CODE_ALREADY_USED'
          ? 'Ce code de sécurité a déjà été utilisé. Veuillez demander un nouveau code à l\'administrateur.'
          : 'Le code de sécurité est incorrect, expiré ou déjà utilisé.'
        
        setCodeError(errorMessage)
        return false
      }

      // Charger les données de la demande
      const formData = await registrationService.loadRegistrationForCorrection(correctionRequest.requestId)
      if (!formData) {
        setCodeError('Impossible de charger les données de la demande.')
        return false
      }

      // Réinitialiser le formulaire avec les données
      methods.reset(formData)
      setCurrentStep(1)
      setCompletedSteps(new Set())

      // Marquer comme vérifié et stocker le code
      setCorrectionRequest((prev) => (prev ? { ...prev, isVerified: true, verifiedCode: code } : null))

      toast.success('Code vérifié !', {
        description: 'Vos données ont été chargées. Vous pouvez maintenant apporter les corrections.',
        duration: 4000,
      })

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue lors de la vérification.'
      setCodeError(errorMessage)
      return false
    }
  }

  // Soumettre le formulaire via RegistrationService
  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true)
    try {
      // Si en mode correction, utiliser updateRegistration avec le code
      if (correctionRequest?.isVerified && correctionRequest.requestId && correctionRequest.verifiedCode) {
        // Le code a déjà été vérifié, on peut soumettre les corrections
        // Passer le code de sécurité à updateRegistration qui appellera la Cloud Function submitCorrections
        const success = await registrationService.updateRegistration(
          correctionRequest.requestId,
          data,
          correctionRequest.verifiedCode
        )

        if (!success) {
          throw new Error('Échec de la mise à jour des corrections')
        }

        // Préparer les données utilisateur pour la page de succès
        const userData = {
          firstName: data.identity.firstName,
          lastName: data.identity.lastName,
          civility: data.identity.civility,
        }

        toast.success('Corrections soumises !', {
          description: 'Vos corrections ont été enregistrées. La demande est de nouveau en attente de validation.',
          duration: 5000,
        })

        // Nettoyer le cache et définir l'état de soumission
        localStorage.removeItem('kara-register-form-v2')
        setSubmittedUserData(userData)
        setCorrectionRequest(null)
        setIsSubmitted(true) // Afficher la page de succès
        
        return
      }

      // Mode normal : nouvelle inscription
      const membershipId = await registrationService.submitRegistration(data)
      
      // Préparer les données utilisateur pour la page de succès
      const userData = {
        firstName: data.identity.firstName,
        lastName: data.identity.lastName,
        civility: data.identity.civility,
      }
      
      // Afficher un message de succès avec le matricule
      toast.success('Inscription réussie !', {
        description: `Votre demande a été enregistrée. Matricule: ${membershipId}`,
        duration: 5000,
      })
      
      // Sauvegarder l'état de soumission dans localStorage pour persister la page de succès
      localStorage.setItem('kara-register-submitted', JSON.stringify({
        userData,
        membershipId,
        timestamp: Date.now(),
      }))
      
      // Nettoyer le cache du formulaire
      localStorage.removeItem('kara-register-form-v2')
      
      setIsSubmitted(true)
      setSubmittedUserData(userData)
    } catch (error) {
      console.error('[RegistrationFormV2] ❌ ERREUR lors de la soumission:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite'
      
      toast.error('Échec de l\'inscription', {
        description: errorMessage,
        duration: 5000,
      })
      
      // Re-lancer l'erreur pour que le test puisse la capturer
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Réinitialiser le formulaire
  const resetForm = useCallback(() => {
    if (confirm('Êtes-vous sûr de vouloir effacer toutes les données ? Cette action est irréversible.')) {
      methods.reset(defaultValues as RegisterFormData)
      setCurrentStep(1)
      setCompletedSteps(new Set())
      localStorage.removeItem('kara-register-form-v2')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [methods])

  // Calcul de la progression
  const progress = useMemo(() => {
    return ((currentStep - 1) / totalSteps) * 100 + (25 * (completedSteps.has(currentStep) ? 1 : 0.5))
  }, [currentStep, totalSteps, completedSteps])

  // Affichage de la page de succès
  if (isSubmitted) {
    // Utiliser les données sauvegardées ou celles du formulaire en dernier recours
    const userDataToShow = submittedUserData || {
      firstName: methods.getValues('identity.firstName'),
      lastName: methods.getValues('identity.lastName'),
      civility: methods.getValues('identity.civility'),
    }
    return <SuccessStepV2 userData={userDataToShow} />
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100">
      {/* Background décoratif */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-kara-primary-dark/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-kara-primary-light/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-linear-to-r from-kara-primary-dark/3 to-kara-primary-light/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto max-w-3xl px-4 py-6 sm:py-12">
        {/* Header */}
        <header className="text-center mb-8 sm:mb-12 animate-in fade-in-0 slide-in-from-top-4 duration-500">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-slate-200/50 mb-4">
            <Sparkles className="w-4 h-4 text-kara-primary-light" />
            <span className="text-sm font-medium text-slate-600">Mutuelle Kara</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-kara-primary-dark to-kara-primary-light bg-clip-text text-transparent">
            Inscription
          </h1>
          
          <p className="text-slate-500 mt-2">
            Complétez votre profil en {totalSteps} étapes simples
          </p>

          {/* Bouton retour accueil */}
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/'}
              className="border-2 border-kara-primary-dark text-kara-primary-dark hover:bg-kara-primary-dark hover:text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300"
            >
              <Home className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </div>
        </header>

        {/* Barre de progression */}
        <div className="mb-8 animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-100">
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-kara-primary-dark to-kara-primary-light transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>Étape {currentStep} sur {totalSteps}</span>
            <span>{Math.round(progress)}% complété</span>
          </div>
        </div>

        {/* Indicateur d'étapes */}
        <StepIndicatorV2
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={(step) => {
            if (completedSteps.has(step) || step === currentStep) {
              setCurrentStep(step)
            }
          }}
        />

        {/* Banner de corrections et formulaire de code */}
        {correctionRequest && !correctionRequest.isVerified && (
          <div className="mt-8 space-y-4 animate-in fade-in-0 slide-in-from-top-4 duration-500">
            <CorrectionBannerV2 reviewNote={correctionRequest.reviewNote} />
            <SecurityCodeFormV2
              onVerify={handleVerifyCode}
              isLoading={isLoadingCorrection}
              error={codeError}
            />
          </div>
        )}

        {/* Formulaire */}
        <FormProvider {...methods}>
          <form 
            onSubmit={async (e) => {
              // Ne pas soumettre si en mode correction et code non vérifié
              if (correctionRequest && !correctionRequest.isVerified) {
                e.preventDefault()
                e.stopPropagation()
                return false
              }

              // Ne soumettre que si on est vraiment à la dernière étape
              if (currentStep !== totalSteps) {
                e.preventDefault()
                e.stopPropagation()
                return false
              }
              
              // Appeler handleSubmit qui va valider et appeler onSubmit
              const result = await handleSubmit(onSubmit)(e)
              return result
            }}
          >
            {/* Contenu de l'étape - Masquer si code non vérifié */}
            {(!correctionRequest || correctionRequest.isVerified) && (
              <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/50 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-200">
                <div
                  key={currentStep}
                  className="p-6 sm:p-8 animate-in fade-in-0 duration-300"
                >
                  {currentStep === 1 && <IdentityStepV2 />}
                  {currentStep === 2 && <AddressStepV2 />}
                  {currentStep === 3 && <CompanyStepV2 />}
                  {currentStep === 4 && <DocumentsStepV2 />}
                </div>
              </div>
            )}

            {/* Navigation - Masquer si code non vérifié */}
            {(!correctionRequest || correctionRequest.isVerified) && (
              <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-300">
                {/* Bouton de réinitialisation */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                  className="text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Réinitialiser
                </Button>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      prevStep(e)
                    }}
                    disabled={currentStep === 1}
                    className={cn(
                      "flex-1 sm:flex-none border-slate-200",
                      currentStep === 1 && "opacity-50"
                    )}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Précédent
                  </Button>

                  {currentStep < totalSteps ? (
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        nextStep(e)
                      }}
                      className="flex-1 sm:flex-none bg-linear-to-r from-kara-primary-dark to-kara-primary-dark/90 hover:from-kara-primary-dark/90 hover:to-kara-primary-dark/80 text-white shadow-lg shadow-kara-primary-dark/20"
                    >
                      Suivant
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-none bg-linear-to-r from-kara-primary-light to-kara-primary-light/90 hover:from-kara-primary-light/90 hover:to-kara-primary-light/80 text-white shadow-lg shadow-kara-primary-light/20"
                      data-testid={correctionRequest?.isVerified ? "registration-form-submit-corrections-button" : undefined}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Envoi...
                        </div>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-1" />
                          {correctionRequest?.isVerified ? 'Soumettre les corrections' : 'Finaliser'}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Footer info */}
            <div className="mt-8 text-center animate-in fade-in-0 duration-500 delay-500">
              <div className="inline-flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-4 py-2 rounded-full">
                <Shield className="w-3 h-3" />
                Vos données sont sauvegardées automatiquement pendant 7 jours
              </div>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  )
}
