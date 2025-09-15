"use client"

import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react'
import { ContractFormData, EntitySearchResult } from '@/types/types'
import { contractCreationDefaultValues } from '@/schemas/schemas'

// Types pour les actions du reducer
type ContractFormAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'UPDATE_FORM_DATA'; payload: Partial<ContractFormData> }
  | { type: 'SET_ENTITY_SEARCH_RESULTS'; payload: EntitySearchResult[] }
  | { type: 'SET_SEARCH_LOADING'; payload: boolean }
  | { type: 'SET_SEARCH_ERROR'; payload: string | null }
  | { type: 'RESET_FORM' }
  | { type: 'VALIDATE_STEP'; payload: { step: number; isValid: boolean } }

// Interface pour l'état du contexte
interface ContractFormState {
  formData: ContractFormData
  currentStep: number
  steps: Array<{
    id: number
    title: string
    description: string
    isCompleted: boolean
    isActive: boolean
    isValid: boolean
  }>
  searchResults: EntitySearchResult[]
  isSearchLoading: boolean
  searchError: string | null
}

// État initial
const initialState: ContractFormState = {
  formData: contractCreationDefaultValues,
  currentStep: 1,
  steps: [
    {
      id: 1,
      title: 'Type de contrat',
      description: 'Choisissez entre contrat individuel ou de groupe',
      isCompleted: false,
      isActive: true,
      isValid: false
    },
    {
      id: 2,
      title: 'Configuration',
      description: 'Définissez le montant, la durée et le type de caisse',
      isCompleted: false,
      isActive: false,
      isValid: false
    },
    {
      id: 3,
      title: 'Planification',
      description: 'Planifiez les versements et la date de début',
      isCompleted: false,
      isActive: false,
      isValid: false
    }
  ],
  searchResults: [],
  isSearchLoading: false,
  searchError: null
}

// Reducer pour gérer l'état
function contractFormReducer(state: ContractFormState, action: ContractFormAction): ContractFormState {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        currentStep: action.payload,
        steps: state.steps.map(step => ({
          ...step,
          isActive: step.id === action.payload,
          isCompleted: step.id < action.payload
        }))
      }

    case 'UPDATE_FORM_DATA':
      return {
        ...state,
        formData: { ...state.formData, ...action.payload }
      }

    case 'SET_ENTITY_SEARCH_RESULTS':
      return {
        ...state,
        searchResults: action.payload,
        searchError: null
      }

    case 'SET_SEARCH_LOADING':
      return {
        ...state,
        isSearchLoading: action.payload
      }

    case 'SET_SEARCH_ERROR':
      return {
        ...state,
        searchError: action.payload
      }

    case 'VALIDATE_STEP':
      return {
        ...state,
        steps: state.steps.map(step =>
          step.id === action.payload.step
            ? { ...step, isValid: action.payload.isValid }
            : step
        )
      }

    case 'RESET_FORM':
      return {
        ...initialState,
        formData: contractCreationDefaultValues
      }

    default:
      return state
  }
}

// Interface pour le contexte
interface ContractFormContextType {
  state: ContractFormState
  dispatch: React.Dispatch<ContractFormAction>
  
  // Actions utilitaires
  goToStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  updateFormData: (data: Partial<ContractFormData>) => void
  validateCurrentStep: (isValid: boolean) => void
  resetForm: () => void
  canGoNext: () => boolean
  canGoPrev: () => boolean
  canSubmit: () => boolean
}

// Création du contexte
const ContractFormContext = createContext<ContractFormContextType | undefined>(undefined)

// Hook personnalisé pour utiliser le contexte
export function useContractForm() {
  const context = useContext(ContractFormContext)
  if (context === undefined) {
    throw new Error('useContractForm must be used within a ContractFormProvider')
  }
  return context
}

// Composant Provider
interface ContractFormProviderProps {
  children: ReactNode
}

export function ContractFormProvider({ children }: ContractFormProviderProps) {
  const [state, dispatch] = useReducer(contractFormReducer, initialState)

  // Actions utilitaires
  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= state.steps.length) {
      dispatch({ type: 'SET_STEP', payload: step })
    }
  }, [state.steps.length])

  const nextStep = useCallback(() => {
    if (state.currentStep < state.steps.length) {
      goToStep(state.currentStep + 1)
    }
  }, [state.currentStep, state.steps.length, goToStep])

  const prevStep = useCallback(() => {
    if (state.currentStep > 1) {
      goToStep(state.currentStep - 1)
    }
  }, [state.currentStep, goToStep])

  const updateFormData = useCallback((data: Partial<ContractFormData>) => {
    dispatch({ type: 'UPDATE_FORM_DATA', payload: data })
  }, [])

  const validateCurrentStep = useCallback((isValid: boolean) => {
    dispatch({ type: 'VALIDATE_STEP', payload: { step: state.currentStep, isValid } })
  }, [state.currentStep])

  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET_FORM' })
  }, [])

  const canGoNext = useCallback(() => {
    const currentStepData = state.steps.find(step => step.id === state.currentStep)
    return currentStepData?.isValid && state.currentStep < state.steps.length
  }, [state.steps, state.currentStep])

  const canGoPrev = useCallback(() => {
    return state.currentStep > 1
  }, [state.currentStep])

  const canSubmit = useCallback(() => {
    return state.currentStep === state.steps.length && 
           state.steps.every(step => step.isValid)
  }, [state.currentStep, state.steps])

  const value: ContractFormContextType = {
    state,
    dispatch,
    goToStep,
    nextStep,
    prevStep,
    updateFormData,
    validateCurrentStep,
    resetForm,
    canGoNext,
    canGoPrev,
    canSubmit
  }

  return (
    <ContractFormContext.Provider value={value}>
      {children}
    </ContractFormContext.Provider>
  )
}
