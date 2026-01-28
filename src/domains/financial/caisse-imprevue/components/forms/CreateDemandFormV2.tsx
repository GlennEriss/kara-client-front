/**
 * Formulaire multi-étapes de création de demande V2
 * 
 * Design moderne avec stepper visuel, couleurs cohérentes, animations
 * Responsive : Mobile, Tablette, Desktop
 * 3 étapes : Membre+Motif, Forfait+Frequence, Contact
 */

'use client'

import { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Step1Member, Step2Forfait, Step3Contact } from './steps'
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CaisseImprevueDemandFormInput } from '../../hooks/useDemandForm'

interface CreateDemandFormV2Props {
  form: UseFormReturn<CaisseImprevueDemandFormInput>
  currentStep: number
  onNext: () => void
  onPrevious: () => void
  onSubmit: (data: CaisseImprevueDemandFormInput) => Promise<void>
  isSubmitting: boolean
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
}: CreateDemandFormV2Props) {
  const handleSubmit = form.handleSubmit(onSubmit)

  return (
    <div className="space-y-6 md:space-y-8">
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
      <Card className="border-0 shadow-xl">
        <CardContent className="p-4 md:p-6 lg:p-8">
          {/* Étapes */}
          <div className="min-h-[400px]">
            {currentStep === 1 && <Step1Member form={form} />}
            {currentStep === 2 && <Step2Forfait form={form} />}
            {currentStep === 3 && <Step3Contact form={form} />}
          </div>

          {/* Navigation - Boutons bien visibles */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onPrevious}
              disabled={currentStep === 1}
              className={cn(
                'min-w-[120px]',
                currentStep === 1
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-50 border-gray-300',
              )}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>

            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={onNext}
                className="min-w-[120px] bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-md hover:shadow-lg transition-all duration-200"
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="min-w-[160px] bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Créer la demande
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
