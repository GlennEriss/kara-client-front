/**
 * Formulaire multi-étapes de création de demande V2
 * 
 * Design moderne avec stepper visuel, couleurs cohérentes, animations
 * Responsive : Mobile, Tablette, Desktop
 * 3 étapes : Membre+Motif, Forfait+Frequence, Contact
 */

'use client'

import { useEffect, useRef } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Step1Member, Step2Forfait, Step3Contact } from './steps'
import { ChevronLeft, ChevronRight, Check, Loader2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { CaisseImprevueDemandFormInput } from '../../hooks/useDemandForm'

interface CreateDemandFormV2Props {
  form: UseFormReturn<CaisseImprevueDemandFormInput>
  currentStep: number
  onNext: () => void
  onPrevious: () => void
  onSubmit: (data: CaisseImprevueDemandFormInput) => Promise<void>
  isSubmitting: boolean
  onResetStep?: () => void
  onResetAll?: () => void
}

const steps = [
  { id: 1, title: 'Membre', description: 'Sélection du membre' },
  { id: 2, title: 'Forfait', description: 'Sélection du forfait' },
  { id: 3, title: 'Contact', description: 'Contact d\'urgence' },
]

export function CreateDemandFormV2({
  form,
  currentStep,
  onNext,
  onPrevious,
  onSubmit,
  isSubmitting,
  onResetStep,
  onResetAll,
}: CreateDemandFormV2Props) {
  const handleSubmit = form.handleSubmit(onSubmit)
  const formTopRef = useRef<HTMLDivElement>(null)

  // Scroll vers le haut à chaque changement d'étape (après le rendu du nouveau step)
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      formTopRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
    // Délai pour s'exécuter après le rendu et les effets de layout (ex: chargement async Step 3)
    const t1 = setTimeout(scrollToTop, 0)
    const t2 = setTimeout(scrollToTop, 150)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [currentStep])

  // Gérer la réinitialisation de l'étape
  const handleResetStep = () => {
    if (onResetStep) {
      onResetStep()
      toast.info('Étape réinitialisée', { description: 'Les champs de cette étape ont été vidés.' })
    }
  }

  return (
    <div ref={formTopRef} className="space-y-6 md:space-y-8">
      {/* Stepper moderne avec cercles et lignes */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-white via-gray-50/50 to-white">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              const isUpcoming = currentStep < step.id

              return (
                <div key={step.id} className="flex items-center flex-1">
                  {/* Étape */}
                  <div className="flex flex-col items-center flex-1">
                    {/* Cercle de l'étape */}
                    <div
                      className={cn(
                        'w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300 font-semibold text-sm md:text-base',
                        isCompleted
                          ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30 scale-110'
                          : isActive
                          ? 'bg-[#234D65] border-[#234D65] text-white shadow-lg shadow-[#234D65]/30 scale-110'
                          : 'bg-gray-100 border-gray-300 text-gray-500',
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5 md:w-6 md:h-6" />
                      ) : (
                        <span>{step.id}</span>
                      )}
                    </div>

                    {/* Titre et description */}
                    <div className="mt-3 text-center max-w-[120px] md:max-w-[150px]">
                      <p
                        className={cn(
                          'text-xs md:text-sm font-semibold transition-colors',
                          isActive
                            ? 'text-[#234D65]'
                            : isCompleted
                            ? 'text-green-600'
                            : 'text-gray-500',
                        )}
                      >
                        Étape {step.id} : {step.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 hidden md:block">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Ligne de connexion */}
                  {index < steps.length - 1 && (
                    <div className="flex-1 mx-2 md:mx-4 h-0.5 relative">
                      <div
                        className={cn(
                          'absolute top-0 left-0 h-full transition-all duration-500',
                          isCompleted
                            ? 'bg-green-500 w-full'
                            : currentStep > step.id
                            ? 'bg-green-500 w-full'
                            : 'bg-gray-200 w-0',
                        )}
                      />
                      <div
                        className={cn(
                          'absolute top-0 left-0 h-full bg-gray-200 transition-all duration-500',
                          isCompleted || currentStep > step.id ? 'w-0' : 'w-full',
                        )}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contenu du formulaire dans une Card */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          {/* Étapes */}
          <div className="min-h-[400px] w-full overflow-x-hidden">
            <div className="max-w-full">
              {currentStep === 1 && <Step1Member form={form} />}
              {currentStep === 2 && <Step2Forfait form={form} />}
              {currentStep === 3 && <Step3Contact form={form} />}
            </div>
          </div>

          {/* Navigation - Boutons avec taille uniforme mobile/desktop */}
          <div className="flex flex-col gap-3 pt-6 mt-6 border-t border-gray-200">
            {/* Ligne des boutons principaux */}
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              {/* Bouton Précédent */}
              <Button
                type="button"
                variant="outline"
                onClick={onPrevious}
                disabled={currentStep === 1}
                className={cn(
                  'h-12 px-6 text-base font-medium',
                  'sm:flex-1 sm:max-w-[180px]',
                  currentStep === 1
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-50 border-gray-300',
                )}
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                Précédent
              </Button>

              {/* Bouton Réinitialiser l'étape */}
              {onResetStep && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResetStep}
                  className="h-12 px-6 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 sm:flex-1 sm:max-w-[180px]"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Réinitialiser
                </Button>
              )}

              {/* Bouton Suivant ou Créer */}
              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={onNext}
                  className="h-12 px-6 text-base font-medium bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-md hover:shadow-lg transition-all duration-200 sm:flex-1 sm:max-w-[180px] sm:ml-auto"
                >
                  Suivant
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    
                    try {
                      const isValid = await form.trigger()
                      
                      if (!isValid) {
                        const errors = form.formState.errors
                        console.log('Erreurs de validation complètes:', JSON.stringify(errors, null, 2))
                        
                        const errorMessages: string[] = []
                        
                        if (errors.memberId) errorMessages.push('Membre non sélectionné')
                        if (errors.cause) errorMessages.push('Motif invalide')
                        if (errors.subscriptionCIID) errorMessages.push('Forfait non sélectionné')
                        if (errors.paymentFrequency) errorMessages.push('Fréquence non sélectionnée')
                        if (errors.desiredStartDate) errorMessages.push('Date de début non sélectionnée')
                        
                        if (errors.emergencyContact) {
                          const ecErrors = errors.emergencyContact as any
                          if (ecErrors.lastName) errorMessages.push('Nom du contact manquant')
                          if (ecErrors.phone1) errorMessages.push('Téléphone du contact invalide')
                          if (ecErrors.relationship) errorMessages.push('Lien de parenté manquant')
                          if (ecErrors.typeId) errorMessages.push('Type de document manquant')
                          if (ecErrors.idNumber) errorMessages.push('N° de document manquant')
                          if (ecErrors.documentPhotoUrl) errorMessages.push('Photo du document manquante')
                        }
                        
                        const description = errorMessages.length > 0 
                          ? errorMessages.slice(0, 3).join(', ') + (errorMessages.length > 3 ? '...' : '')
                          : 'Vérifiez que tous les champs obligatoires sont remplis.'
                        
                        toast.error('Formulaire incomplet', { description })
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                        return
                      }
                      
                      const formData = form.getValues()
                      console.log('Données du formulaire à soumettre:', formData)
                      await onSubmit(formData)
                    } catch (error) {
                      console.error('Erreur lors de la soumission:', error)
                      toast.error('Une erreur est survenue', {
                        description: error instanceof Error ? error.message : 'Veuillez réessayer.',
                      })
                    }
                  }}
                  disabled={isSubmitting}
                  className="h-12 px-6 text-base font-medium bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed sm:flex-1 sm:max-w-[200px] sm:ml-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Créer la demande
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
