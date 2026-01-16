'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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

import StepIndicatorV2 from './StepIndicatorV2'
import IdentityStepV2 from './steps/IdentityStepV2'
import AddressStepV2 from './steps/AddressStepV2'
import CompanyStepV2 from './steps/CompanyStepV2'
import DocumentsStepV2 from './steps/DocumentsStepV2'
import SuccessStepV2 from './steps/SuccessStepV2'

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

  const totalSteps = STEPS.length

  // Form setup avec react-hook-form
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: defaultValues as RegisterFormData,
    mode: 'onChange',
  })

  const { handleSubmit, trigger } = methods

  // Charger les données du cache au montage (une seule fois)
  useEffect(() => {
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
            if (isMounted) {
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    const result = await trigger(fieldsToValidate)
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

  // Soumettre le formulaire
  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true)
    try {
      // TODO: Implémenter la soumission via RegistrationService
      console.log('Form data:', data)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setIsSubmitted(true)
      localStorage.removeItem('kara-register-form-v2')
    } catch (error) {
      console.error('Erreur lors de la soumission:', error)
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
    return <SuccessStepV2 userData={methods.getValues('identity')} />
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

        {/* Formulaire */}
        <FormProvider {...methods}>
          <form 
            onSubmit={(e) => {
              // Ne soumettre que si on est vraiment à la dernière étape
              if (currentStep !== totalSteps) {
                e.preventDefault()
                e.stopPropagation()
                return false
              }
              return handleSubmit(onSubmit)(e)
            }}
          >
            {/* Contenu de l'étape */}
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

            {/* Navigation */}
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
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Envoi...
                      </div>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-1" />
                        Finaliser
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

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
