"use client"

import React from 'react'
import { useContractForm } from '@/providers/ContractFormProvider'
import { Step1ContractType } from './steps/Step1ContractType'
import { Step2CaisseConfig } from './steps/Step2CaisseConfig'
import { Step3PaymentPlan } from './steps/Step3PaymentPlan'

export function ContractFormSteps() {
  const { state } = useContractForm()
  const { currentStep } = state

  return (
    <div className="min-h-[400px]">
      <div className="transition-all duration-500 ease-in-out">
        {currentStep === 1 && <Step1ContractType />}
        {currentStep === 2 && <Step2CaisseConfig />}
        {currentStep === 3 && <Step3PaymentPlan />}
      </div>
    </div>
  )
}
