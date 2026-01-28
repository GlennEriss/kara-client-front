/**
 * Formulaire multi-étapes de création de demande V2
 * 
 * Responsive : Mobile, Tablette, Desktop
 * 3 étapes : Membre+Motif, Forfait+Frequence, Contact
 */

'use client'

import { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Step1Member, Step2Forfait, Step3Contact } from './steps'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CaisseImprevueDemandFormInput } from '../../hooks/useDemandForm'

interface CreateDemandFormV2Props {
  form: UseFormReturn<CaisseImprevueDemandFormInput>
  currentStep: number
  onNext: () => void
  onPrevious: () => void
  onSubmit: (data: CaisseImprevueDemandFormInput) => Promise<void>
  isSubmitting: boolean
}

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
    <div className="space-y-6">
      {/* Stepper */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className={currentStep >= 1 ? 'font-semibold' : ''}>Étape 1 : Membre</span>
          <span className={currentStep >= 2 ? 'font-semibold' : ''}>Étape 2 : Forfait</span>
          <span className={currentStep >= 3 ? 'font-semibold' : ''}>Étape 3 : Contact</span>
        </div>
        <Progress value={(currentStep / 3) * 100} className="h-2" />
      </div>

      {/* Étapes */}
      {currentStep === 1 && <Step1Member form={form} />}
      {currentStep === 2 && <Step2Forfait form={form} />}
      {currentStep === 3 && <Step3Contact form={form} />}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Précédent
        </Button>
        {currentStep < 3 ? (
          <Button type="button" onClick={onNext}>
            Suivant
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Création...' : 'Créer la demande'}
          </Button>
        )}
      </div>
    </div>
  )
}
