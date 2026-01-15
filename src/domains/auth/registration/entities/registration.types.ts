/**
 * Types métier pour le module de registration
 */

import type { RegisterFormData } from '@/types/types'

/**
 * Étape du formulaire d'inscription
 */
export interface RegistrationStep {
  id: number
  title: string
  description: string
  isCompleted: boolean
  isValid: boolean
}

/**
 * Données de cache pour le formulaire d'inscription
 */
export interface RegistrationCache {
  formData: RegisterFormData
  currentStep: number
  completedSteps: number[]
  timestamp: number
  membershipId?: string
  version?: string
}

/**
 * Données de soumission sauvegardées
 */
export interface RegistrationSubmissionData {
  membershipId: string
  userData: {
    firstName?: string
    lastName?: string
    civility?: string
  }
  timestamp: number
}

/**
 * Requête de correction avec code de sécurité
 */
export interface CorrectionRequest {
  requestId: string
  reviewNote: string
  securityCode: string
  isVerified: boolean
}

/**
 * État du formulaire d'inscription
 */
export interface RegistrationState {
  currentStep: number
  totalSteps: number
  completedSteps: Set<number>
  isLoading: boolean
  isSubmitting: boolean
  isCacheLoaded: boolean
  isSubmitted: boolean
  submissionError: string | null
  userData?: {
    firstName?: string
    lastName?: string
    civility?: string
  }
  correctionRequest: CorrectionRequest | null
  securityCodeInput: string
}

/**
 * Résultat de validation d'une étape
 */
export interface StepValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

/**
 * Options de configuration pour le cache
 */
export interface CacheConfig {
  expiry: number // en millisecondes
  submissionExpiry: number // en millisecondes
  debounceDelay: number // en millisecondes
  version: string
}
