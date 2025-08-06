'use client'

import React, { Suspense, lazy } from 'react'
import { useRegister } from '@/providers/RegisterProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Send, Save, RotateCcw, CheckCircle, Shield, AlertCircle, Home, Lock, Key } from 'lucide-react'
import { cn } from '@/lib/utils'
import routes from '@/constantes/routes'

// Lazy loading des composants step pour optimiser les performances
const Step1 = lazy(() => import('./Step1'))
const Step2 = lazy(() => import('./Step2'))
const Step3 = lazy(() => import('./Step3'))
const Step4 = lazy(() => import('./Step4'))
const Step5 = lazy(() => import('./Step5'))

// Composant de fallback pour le lazy loading
const StepSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-3/4"></div>
    <div className="space-y-4">
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
    </div>
  </div>
)

// Configuration des étapes
const STEPS_CONFIG = [
  { id: 1, title: 'Identité', description: 'Informations personnelles' },
  { id: 2, title: 'Adresse', description: 'Lieu de résidence' },
  { id: 3, title: 'Entreprise', description: 'Informations professionnelles' },
  { id: 4, title: 'Documents', description: 'Pièces d\'identité' },
] as const

function Register() {
  const {
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
    submitForm,
    resetForm,
    getStepProgress,
    hasCachedData,
    clearCache,
    saveToCache,
    validateCurrentStep,
    verifySecurityCode,
    setSecurityCodeInput
  } = useRegister()

  // Gestionnaire pour passer à l'étape suivante
  const handleNext = async () => {
    const success = await nextStep()
    if (success) {
      // Optionnel : scroll vers le haut
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Gestionnaire pour l'étape précédente
  const handlePrev = () => {
    prevStep()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Gestionnaire pour la soumission finale
  const handleSubmit = async () => {
    try {
      // D'abord valider l'étape actuelle (étape 4) avant de soumettre
      const isCurrentStepValid = await validateCurrentStep()
      
      if (!isCurrentStepValid) {
        // Si la validation échoue, ne pas soumettre
        console.log('Validation de l\'étape 4 échouée - soumission annulée')
        return
      }
      
      await submitForm()
      // La redirection vers le step 5 sera gérée automatiquement par le provider
      // via l'état isSubmitted
    } catch (error) {
      // L'erreur est maintenant gérée par le provider et stockée dans submissionError
      // Elle sera affichée dans l'interface utilisateur ci-dessous
      console.error('Erreur lors de la soumission:', error)
    }
  }

  // Gestionnaire pour reset
  const handleReset = () => {
    if (confirm('Êtes-vous sûr de vouloir effacer toutes les données ?')) {
      resetForm()
    }
  }

  // Rendu du composant step actuel
  const renderCurrentStep = () => {
    const stepProps = { form }
    
    switch (currentStep) {
      case 1:
        return (
          <Suspense fallback={<StepSkeleton />}>
            <Step1 {...stepProps} />
          </Suspense>
        )
      case 2:
        return (
          <Suspense fallback={<StepSkeleton />}>
            <Step2 {...stepProps} />
          </Suspense>
        )
      case 3:
        return (
          <Suspense fallback={<StepSkeleton />}>
            <Step3 {...stepProps} />
          </Suspense>
        )
      case 4:
        return (
          <Suspense fallback={<StepSkeleton />}>
            <Step4 {...stepProps} />
          </Suspense>
        )
      default:
        return <div>Étape non trouvée</div>
    }
  }

  // Affichage de chargement initial
  if (!isCacheLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Chargement du formulaire...</p>
        </div>
      </div>
    )
  }

  // Affichage du formulaire de code de sécurité pour les corrections
  if (correctionRequest && !correctionRequest.isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 py-4 sm:py-8 w-full max-w-full overflow-x-hidden relative">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#224D62]/10 to-transparent rounded-full opacity-30 transform translate-x-48 -translate-y-48"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#CBB171]/10 to-transparent rounded-full opacity-30 transform -translate-x-48 translate-y-48"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-[#224D62]/10 to-[#CBB171]/10 rounded-full opacity-20 transform -translate-x-32 -translate-y-32"></div>
        </div>

        <div className="container mx-auto max-w-2xl px-2 sm:px-4 w-full relative z-10">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 sm:gap-0 w-full">
              <div className="w-full min-w-0">
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[#224D62] via-[#224D62] to-[#CBB171] bg-clip-text text-transparent break-words">
                  Corrections demandées
                </h1>
                <p className="text-[#224D62]/80 mt-2 text-sm sm:text-base break-words">
                  Accédez à votre formulaire pour apporter les corrections demandées
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = routes.public.homepage}
                  className="border-[#CBB171]/30 text-[#CBB171] hover:bg-[#CBB171]/5 hover:border-[#CBB171]/50 transition-all duration-200 whitespace-nowrap"
                >
                  <Home className="w-4 h-4" />
                  <span>Retourner à l'accueil</span>
                </Button>
              </div>
            </div>
          </div>

          <Card className="shadow-2xl border-0 w-full max-w-full overflow-x-auto bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-orange-500/5 via-orange-600/5 to-orange-700/10 border-b border-orange-200/20">
              <CardTitle className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent flex items-center space-x-2">
                <Lock className="w-6 h-6" />
                <span>Vérification de sécurité</span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-4 sm:p-8 w-full max-w-full overflow-x-auto">
              <div className="space-y-6">
                {/* Message de correction */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-orange-800">
                        Corrections demandées
                      </h3>
                      <p className="text-sm text-orange-700 whitespace-pre-line">
                        {correctionRequest.reviewNote}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Formulaire de code de sécurité */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-[#224D62] mb-2">
                      Code de sécurité requis
                    </h3>
                    <p className="text-sm text-gray-600">
                      Veuillez saisir le code de sécurité qui vous a été envoyé pour accéder à votre formulaire de correction.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="securityCode" className="text-sm font-medium text-[#224D62]">
                      Code de sécurité <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                      <Input
                        id="securityCode"
                        type="text"
                        placeholder="Ex: 123456"
                        value={securityCodeInput}
                        onChange={(e) => setSecurityCodeInput(e.target.value)}
                        className="pl-10 text-center font-mono text-lg tracking-widest"
                        maxLength={6}
                        autoComplete="off"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Le code de sécurité est composé de 6 chiffres
                    </p>
                  </div>

                  <Button
                    onClick={verifySecurityCode}
                    disabled={!securityCodeInput.trim() || securityCodeInput.length !== 6}
                    className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Vérifier le code et charger mes données
                  </Button>
                </div>

                <div className="text-center space-y-3">
                  <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500/5 to-orange-600/5 px-4 py-2 rounded-full border border-orange-200/20">
                    <Shield className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-[#224D62] font-medium">
                      Votre code de sécurité protège l'accès à vos données personnelles
                    </span>
                  </div>
                  
                  {/* Message informatif sur le cache */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-700">
                        <p className="font-medium mb-1">Mode correction activé</p>
                        <p>Vos données précédentes ont été temporairement masquées pour permettre les corrections. Elles seront restaurées après vérification du code de sécurité.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Affichage de l'étape de succès (seulement si pas de correction en cours)
  if (isSubmitted && !correctionRequest) {
    // Récupérer l'ID du membership depuis le cache s'il est disponible
    const submissionData = (() => {
      try {
        const membershipId = localStorage.getItem('register-membership-id')
        return membershipId || undefined
      } catch {
        return undefined
      }
    })()

    return (
      <Suspense fallback={<StepSkeleton />}>
        <Step5 userData={userData} membershipId={submissionData} />
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 py-4 sm:py-8 w-full max-w-full overflow-x-hidden relative">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#224D62]/10 to-transparent rounded-full opacity-30 transform translate-x-48 -translate-y-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#CBB171]/10 to-transparent rounded-full opacity-30 transform -translate-x-48 translate-y-48"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-[#224D62]/10 to-[#CBB171]/10 rounded-full opacity-20 transform -translate-x-32 -translate-y-32"></div>
      </div>

      <div className="container mx-auto max-w-4xl px-2 sm:px-4 w-full relative z-10">
        
        {/* Header avec indicateur de cache */}
        <div className="mb-6 sm:mb-8">
          {/* Message de correction si en mode correction */}
          {correctionRequest?.isVerified && (
            <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-orange-800">
                    Mode correction activé
                  </h3>
                  <p className="text-sm text-orange-700">
                    Vous êtes en train de corriger votre demande. Veuillez apporter les modifications demandées ci-dessous :
                  </p>
                  <div className="bg-white border border-orange-300 rounded p-3">
                    <p className="text-sm text-orange-800 whitespace-pre-line">
                      {correctionRequest.reviewNote}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 sm:gap-0 w-full">
            <div className="w-full min-w-0">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[#224D62] via-[#224D62] to-[#CBB171] bg-clip-text text-transparent break-words">
                {correctionRequest?.isVerified ? 'Correction de la demande' : 'Inscription'}
              </h1>
              <p className="text-[#224D62]/80 mt-2 text-sm sm:text-base break-words">
                {correctionRequest?.isVerified 
                  ? 'Apportez les corrections demandées à votre demande d\'adhésion'
                  : `Complétez votre profil en ${totalSteps} étapes simples`
                }
              </p>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = routes.public.homepage}
                className="border-[#CBB171]/30 text-[#CBB171] hover:bg-[#CBB171]/5 hover:border-[#CBB171]/50 transition-all duration-200 whitespace-nowrap"
              >
                <Home className="w-4 h-4" />
                <span>Retourner à l'accueil</span>
              </Button>
            </div>
            
            {/* Indicateurs de cache et actions */}

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              {hasCachedData() && (
                <Badge className="bg-gradient-to-r from-[#224D62] to-[#CBB171] text-white whitespace-nowrap shadow-sm">
                  📄 Données sauvegardées
                </Badge>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={saveToCache}
                className="hidden sm:flex items-center space-x-1 border-[#224D62]/30 text-[#224D62] hover:bg-[#224D62]/5 hover:border-[#224D62]/50 transition-all duration-200"
              >
                <Save className="w-4 h-4" />
                <span>Sauvegarder</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="space-y-3 w-full">
            <div className="flex justify-between text-sm text-[#224D62] font-medium">
              <span>Progression</span>
              <span className="text-[#224D62]">{Math.round(getStepProgress())}%</span>
            </div>
            <div className="relative">
              {/* Fond de la barre */}
              <div className="h-3 bg-gray-200 rounded-full shadow-inner w-full"></div>
              {/* Barre de progression */}
              <div 
                className="absolute top-0 left-0 h-3 bg-gradient-to-r from-[#224D62] via-[#224D62] to-[#CBB171] rounded-full shadow-sm transition-all duration-500 ease-out"
                style={{ width: `${getStepProgress()}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Indicateur des étapes */}
        <div className="mb-8 sm:mb-10 w-full overflow-x-auto">
          <div className="flex items-center justify-between flex-nowrap gap-2 sm:gap-0 min-w-0 w-full overflow-x-auto pb-4">
            {STEPS_CONFIG.map((step, index) => (
              <div key={step.id} className="flex items-center min-w-0">
                <div
                  className={cn(
                    "relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full text-sm sm:text-base font-bold transition-all duration-300 shrink-0 shadow-lg",
                    currentStep === step.id
                      ? "bg-gradient-to-r from-[#224D62] to-[#CBB171] text-white border-2 border-white shadow-[#224D62]/20 scale-110"
                      : completedSteps.has(step.id)
                      ? "bg-gradient-to-r from-[#CBB171] to-[#224D62] text-white border-2 border-white shadow-[#CBB171]/20"
                      : "bg-white text-gray-400 border-2 border-gray-200 shadow-gray-100"
                  )}
                >
                  {completedSteps.has(step.id) ? (
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                  ) : (
                    step.id
                  )}
                  
                  {/* Glow effect for current step */}
                  {currentStep === step.id && (
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#224D62] to-[#CBB171] opacity-30 animate-pulse -z-10 scale-150"></div>
                  )}
                </div>
                
                <div className="ml-3 sm:ml-4 hidden sm:block min-w-0">
                  <div className={cn(
                    "text-sm sm:text-base font-bold truncate transition-colors duration-200",
                    currentStep === step.id 
                      ? "text-[#224D62]" 
                      : completedSteps.has(step.id)
                      ? "text-[#CBB171]"
                      : "text-gray-500"
                  )}>
                    {step.title}
                  </div>
                  <div className={cn(
                    "text-xs sm:text-sm truncate transition-colors duration-200",
                    currentStep === step.id 
                      ? "text-[#224D62]/80" 
                      : completedSteps.has(step.id)
                      ? "text-[#CBB171]/80"
                      : "text-gray-400"
                  )}>
                    {step.description}
                  </div>
                </div>
                
                {index < STEPS_CONFIG.length - 1 && (
                  <div className={cn(
                    "flex-1 h-1 mx-3 sm:mx-6 hidden sm:block min-w-0 rounded-full transition-all duration-300",
                    completedSteps.has(step.id)
                      ? "bg-gradient-to-r from-[#CBB171] to-[#224D62] shadow-sm"
                      : "bg-gray-200"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contenu principal */}
        <Card className="shadow-2xl border-0 w-full max-w-full overflow-x-auto bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 border-b border-[#224D62]/20">
            <CardTitle className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-[#224D62] to-[#CBB171] bg-clip-text text-transparent">
              Étape {currentStep}: {STEPS_CONFIG[currentStep - 1]?.title}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-8 w-full max-w-full overflow-x-auto">
            {renderCurrentStep()}
          </CardContent>
        </Card>

        {/* Affichage des erreurs de soumission */}
        {submissionError && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Erreur lors de la soumission</h3>
                <p className="text-sm text-red-600 mt-1">{submissionError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Boutons de navigation */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 w-full">
          {/* Mobile: flex-col, Desktop: flex-row */}
          <div className="flex flex-col sm:flex-row w-full gap-3 sm:gap-4">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 1 || isLoading}
              className="flex items-center justify-center space-x-2 w-full sm:w-auto h-12 border-2 border-[#224D62]/30 text-[#224D62] hover:border-[#224D62]/50 hover:text-[#224D62] hover:bg-[#224D62]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Précédent</span>
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={isLoading}
                className="flex items-center justify-center space-x-2 min-w-0 w-full sm:w-auto h-12 bg-gradient-to-r bg-[#224D62] hover:from-[#224D62]/90 hover:via-[#224D62]/90 hover:to-[#CBB171]/90 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>Suivant</span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center justify-center space-x-2 min-w-0 w-full sm:w-auto h-12 bg-[#224D62] hover:from-[#CBB171]/90 hover:via-[#CBB171]/90 hover:to-[#224D62]/90 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>{correctionRequest?.isVerified ? 'Soumettre les corrections' : 'Finaliser'}</span>
                  </>
                )}
              </Button>
            )}
          </div>
          {/* Bouton sauvegarder toujours en bas en mobile, à droite en desktop */}
          <Button
            variant="outline"
            size="sm"
            onClick={saveToCache}
            className="flex items-center justify-center space-x-2 w-full sm:w-auto h-10 border-2 border-[#CBB171]/30 text-[#CBB171] hover:border-[#CBB171]/50 hover:bg-[#CBB171]/5 transition-all duration-200 font-medium"
          >
            <Save className="w-4 h-4" />
            <span>Sauvegarder</span>
          </Button>
        </div>

        {/* Message d'aide */}
        <div className="mt-6 sm:mt-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#224D62]/5 to-[#CBB171]/5 px-4 py-2 rounded-full border border-[#224D62]/20">
            <Shield className="w-4 h-4 text-[#CBB171]" />
            <span className="text-sm text-[#224D62] font-medium">
              Vos données sont automatiquement sauvegardées pendant 7 jours
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register 