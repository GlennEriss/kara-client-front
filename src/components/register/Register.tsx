'use client'

import React, { Suspense, lazy } from 'react'
import { useRegister } from '@/providers/RegisterProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Send, Save, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

// Lazy loading des composants step pour optimiser les performances
const Step1 = lazy(() => import('./Step1'))
const Step2 = lazy(() => import('./Step2'))
const Step3 = lazy(() => import('./Step3'))
const Step4 = lazy(() => import('./Step4'))

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
  { id: 4, title: 'Assurance', description: 'Couverture d\'assurance' },
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
    nextStep,
    prevStep,
    submitForm,
    resetForm,
    getStepProgress,
    hasCachedData,
    clearCache,
    saveToCache
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
      await submitForm()
      // Redirection ou message de succès
      // router.push('/success') ou setState pour afficher un message
    } catch (error) {
      console.error('Erreur lors de la soumission:', error)
      // Afficher un toast d'erreur
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-4 sm:py-8 w-full max-w-full overflow-x-hidden">
      <div className="container mx-auto max-w-4xl px-2 sm:px-4 w-full">
        
        {/* Header avec indicateur de cache */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2 sm:gap-0 w-full">
            <div className="w-full min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">Inscription</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base break-words">Complétez votre profil en {totalSteps} étapes</p>
            </div>
            
            {/* Indicateurs de cache et actions */}
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              {hasCachedData() && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 whitespace-nowrap">
                  📄 Données sauvegardées
                </Badge>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={saveToCache}
                className="hidden sm:flex items-center space-x-1"
              >
                <Save className="w-4 h-4" />
                <span>Sauvegarder</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-red-600 hover:text-red-700"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="space-y-2 w-full">
            <div className="flex justify-between text-xs sm:text-sm text-gray-600">
              <span>Progression</span>
              <span>{Math.round(getStepProgress())}%</span>
            </div>
            <Progress value={getStepProgress()} className="h-2" />
          </div>
        </div>

        {/* Indicateur des étapes */}
        <div className="mb-6 sm:mb-8 w-full overflow-x-auto">
          <div className="flex items-center justify-between flex-nowrap gap-2 sm:gap-0 min-w-0 w-full overflow-x-auto pb-2">
            {STEPS_CONFIG.map((step, index) => (
              <div key={step.id} className="flex items-center min-w-0">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 text-xs sm:text-sm font-medium transition-colors shrink-0",
                    currentStep === step.id
                      ? "border-primary bg-primary text-white"
                      : completedSteps.has(step.id)
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-gray-300 bg-white text-gray-500"
                  )}
                >
                  {completedSteps.has(step.id) ? "✓" : step.id}
                </div>
                
                <div className="ml-2 sm:ml-3 hidden sm:block min-w-0">
                  <div className={cn(
                    "text-xs sm:text-sm font-medium truncate",
                    currentStep === step.id ? "text-primary" : "text-gray-900"
                  )}>
                    {step.title}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500 truncate">{step.description}</div>
                </div>
                
                {index < STEPS_CONFIG.length - 1 && (
                  <div className="flex-1 h-0.5 bg-gray-300 mx-2 sm:mx-4 hidden sm:block min-w-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contenu principal */}
        <Card className="shadow-lg border-0 w-full max-w-full overflow-x-auto">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
            <CardTitle className="text-base sm:text-xl">
              Étape {currentStep}: {STEPS_CONFIG[currentStep - 1]?.title}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-3 sm:p-6 w-full max-w-full overflow-x-auto">
            {renderCurrentStep()}
          </CardContent>
        </Card>

        {/* Boutons de navigation */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 w-full">
          {/* Mobile: flex-col, Desktop: flex-row */}
          <div className="flex flex-col sm:flex-row w-full gap-2 sm:gap-4">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 1 || isLoading}
              className="flex items-center space-x-2 w-full sm:w-auto"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Précédent</span>
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={isLoading}
                className="flex items-center space-x-2 min-w-0 w-full sm:w-auto"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <span>Suivant</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center space-x-2 min-w-0 w-full sm:w-auto bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Finaliser</span>
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
            className="flex items-center space-x-1 w-full sm:w-auto"
          >
            <Save className="w-4 h-4" />
            <span>Sauvegarder</span>
          </Button>
        </div>

        {/* Message d'aide */}
        <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-500 break-words">
          Vos données sont automatiquement sauvegardées pendant 7 jours
        </div>
      </div>
    </div>
  )
}

export default Register 