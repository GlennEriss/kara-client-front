"use client"

import React from 'react'
import { useContractForm } from '@/providers/ContractFormProvider'
import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ContractFormStepper() {
  const { state, goToStep } = useContractForm()
  const { steps, currentStep } = state

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.isActive
          const isCompleted = step.isCompleted
          const isClickable = isCompleted || index === 0

          return (
            <React.Fragment key={step.id}>
              {/* Étape */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => isClickable && goToStep(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                    "border-2 font-semibold text-sm",
                    isCompleted
                      ? "bg-green-500 border-green-500 text-white hover:bg-green-600"
                      : isActive
                      ? "bg-[#234D65] border-[#234D65] text-white"
                      : "bg-gray-100 border-gray-300 text-gray-500",
                    isClickable && !isActive && !isCompleted
                      ? "hover:bg-gray-200 hover:border-gray-400 cursor-pointer"
                      : "cursor-default"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </button>
                
                {/* Titre de l'étape */}
                <div className="mt-3 text-center">
                  <h3 className={cn(
                    "text-sm font-semibold transition-colors duration-300",
                    isActive
                      ? "text-[#234D65]"
                      : isCompleted
                      ? "text-green-600"
                      : "text-gray-500"
                  )}>
                    {step.title}
                  </h3>
                  <p className={cn(
                    "text-xs mt-1 transition-colors duration-300",
                    isActive
                      ? "text-[#234D65]"
                      : isCompleted
                      ? "text-green-600"
                      : "text-gray-400"
                  )}>
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Ligne de connexion entre les étapes */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-4">
                  <div className={cn(
                    "h-0.5 transition-all duration-300",
                    isCompleted
                      ? "bg-green-500"
                      : "bg-gray-300"
                  )} />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Indicateur de progression */}
      <div className="mt-6">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] h-2 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Étape {currentStep} sur {steps.length}</span>
          <span>{Math.round(((currentStep - 1) / (steps.length - 1)) * 100)}% terminé</span>
        </div>
      </div>
    </div>
  )
}
