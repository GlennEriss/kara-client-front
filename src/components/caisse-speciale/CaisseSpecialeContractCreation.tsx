"use client"

import React from 'react'
import { ContractFormProvider, useContractForm } from '@/providers/ContractFormProvider'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Circle,
  FileText,
  Settings,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Step1ContractType } from './steps/Step1ContractType'
import { Step2ContractConfiguration } from './steps/Step2ContractConfiguration'
import { Step3ContractCreation } from './steps/Step3ContractCreation'

// Composant interne qui utilise le contexte
function ContractCreationContent() {
  const { 
    state, 
    nextStep, 
    prevStep, 
    canGoNext, 
    canGoPrev 
  } = useContractForm()
  
  const { currentStep, steps } = state

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1ContractType />
      case 2:
        return <Step2ContractConfiguration />
      case 3:
        return <Step3ContractCreation />
      default:
        return <Step1ContractType />
    }
  }

  const getStepIcon = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return <FileText className="w-4 h-4" />
      case 2:
        return <Settings className="w-4 h-4" />
      case 3:
        return <Calendar className="w-4 h-4" />
      default:
        return <Circle className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="container mx-auto max-w-4xl">
        {/* En-tête avec progression */}
        <div className="mb-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Création d'un contrat Caisse Spéciale
            </h1>
            <p className="text-gray-600">
              Suivez les étapes pour créer un nouveau contrat
            </p>
          </div>

          {/* Indicateur de progression */}
          <div className="flex justify-center mb-8">
            <div className="flex flex-col items-stretch gap-6 sm:flex-row sm:items-center sm:space-x-4">
              {steps.map((step, _index) => (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-12 h-12 rounded-full border-2 flex items-center justify-center font-semibold transition-all duration-500 relative",
                      step.isActive
                        ? "bg-gradient-to-br from-[#234D65] to-blue-600 border-transparent text-white shadow-lg"
                        : step.isCompleted
                        ? "bg-green-500 border-transparent text-white shadow-lg"
                        : "border-gray-300 text-gray-400 bg-white"
                    )}>
                      {step.isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        getStepIcon(step.id)
                      )}
                      {step.isActive && (
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#234D65] to-blue-600 animate-ping opacity-25" />
                      )}
                    </div>
                    <span className={cn(
                      "text-xs font-medium mt-2 transition-colors duration-300",
                      step.isActive || step.isCompleted ? "text-[#234D65]" : "text-gray-400"
                    )}>
                      {step.title}
                    </span>
                  </div>
                  {_index < steps.length - 1 && (
                    <>
                      <div className={cn(
                        "sm:hidden w-0.5 h-6 mx-auto rounded-full transition-all duration-500",
                        step.isCompleted ? "bg-gradient-to-b from-[#234D65] to-blue-600" : "bg-gray-200"
                      )} />
                      <div className={cn(
                        "hidden sm:block w-16 h-1 rounded-full transition-all duration-500",
                        step.isCompleted ? "bg-gradient-to-r from-[#234D65] to-blue-600" : "bg-gray-200"
                      )} />
                    </>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-xl rounded-2xl">
          <CardContent className="p-4 sm:p-8">
            {renderCurrentStep()}
          </CardContent>
        </Card>

        {/* Navigation entre les étapes */}
        {currentStep < 3 && (
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:justify-between gap-3 mt-8">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={!canGoPrev()}
              className={cn(
                "h-11 sm:h-12 w-full sm:w-auto px-6 border-2 transition-all duration-300 rounded-xl",
                canGoPrev()
                  ? "border-gray-300 hover:border-[#234D65] hover:bg-[#234D65] hover:text-white"
                  : "border-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>

            <Button
              onClick={nextStep}
              disabled={!canGoNext()}
              className={cn(
                "h-11 sm:h-12 w-full sm:w-auto px-6 transition-all duration-300 rounded-xl",
                canGoNext()
                  ? "bg-gradient-to-r from-[#234D65] to-blue-600 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg hover:shadow-xl"
                  : "bg-gray-400 text-gray-600 cursor-not-allowed"
              )}
            >
              Suivant
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Composant principal avec le provider
export default function CaisseSpecialeContractCreation() {
  return (
    <ContractFormProvider>
      <ContractCreationContent />
    </ContractFormProvider>
  )
}
