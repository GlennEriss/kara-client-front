"use client"

import React from 'react'
import { useContractForm } from '@/providers/ContractFormProvider'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ContractFormActions() {
  const { 
    state, 
    nextStep, 
    prevStep, 
    canGoNext, 
    canGoPrev, 
    canSubmit,
    resetForm 
  } = useContractForm()
  
  const { currentStep, steps } = state
  const isLastStep = currentStep === steps.length

  const handleSubmit = async () => {
    if (!canSubmit()) return
    
    try {
      // TODO: Implémenter la soumission du formulaire
      console.log('Soumission du formulaire:', state.formData)
      
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // TODO: Rediriger vers la page de succès ou la liste des contrats
      alert('Contrat créé avec succès !')
      
    } catch (error) {
      console.error('Erreur lors de la création du contrat:', error)
      alert('Erreur lors de la création du contrat')
    }
  }

  return (
    <div className="flex items-center justify-between pt-6 border-t border-gray-200">
      {/* Bouton de réinitialisation */}
      <Button
        variant="outline"
        onClick={resetForm}
        className="px-6 py-2 border-2 border-gray-300 hover:border-gray-400 transition-all duration-300"
      >
        Réinitialiser
      </Button>

      {/* Boutons de navigation */}
      <div className="flex items-center gap-4">
        {/* Bouton précédent */}
        {currentStep > 1 && (
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={!canGoPrev()}
            className={cn(
              "px-6 py-2 border-2 transition-all duration-300",
              canGoPrev()
                ? "border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white"
                : "border-gray-300 text-gray-400 cursor-not-allowed"
            )}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Précédent
          </Button>
        )}

        {/* Bouton suivant ou soumettre */}
        {!isLastStep ? (
          <Button
            onClick={nextStep}
            disabled={!canGoNext()}
            className={cn(
              "px-6 py-2 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300",
              !canGoNext() && "opacity-50 cursor-not-allowed"
            )}
          >
            Suivant
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit()}
            className={cn(
              "px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300",
              !canSubmit() && "opacity-50 cursor-not-allowed"
            )}
          >
            <Save className="w-4 h-4 mr-2" />
            Créer le contrat
          </Button>
        )}
      </div>
    </div>
  )
}
