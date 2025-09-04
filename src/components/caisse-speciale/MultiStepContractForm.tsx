"use client"

import React from 'react'
import { ContractFormProvider } from '@/providers/ContractFormProvider'
import { ContractFormStepper } from './ContractFormStepper'
import { ContractFormSteps } from './ContractFormSteps'
import { ContractFormActions } from './ContractFormActions'

export default function MultiStepContractForm() {
  return (
    <ContractFormProvider>
      <div className="p-6 space-y-8">
        {/* Barre de progression des étapes */}
        <ContractFormStepper />
        
        {/* Contenu des étapes */}
        <ContractFormSteps />
        
        {/* Actions de navigation */}
        <ContractFormActions />
      </div>
    </ContractFormProvider>
  )
}
