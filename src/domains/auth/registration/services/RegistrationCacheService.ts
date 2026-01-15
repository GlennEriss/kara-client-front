/**
 * Service de gestion du cache pour le formulaire d'inscription
 * Utilise localStorage pour persister les données
 */

import { IRegistrationCacheService } from './IRegistrationCacheService'
import type { RegisterFormData } from '@/domains/auth/registration/entities'
import type { RegistrationSubmissionData } from '@/domains/auth/registration/entities'
import type { CacheConfig } from '@/domains/auth/registration/entities'

// Clés de cache
const CACHE_KEYS = {
  FORM_DATA: 'register-form-data',
  CURRENT_STEP: 'register-current-step',
  COMPLETED_STEPS: 'register-completed-steps',
  TIMESTAMP: 'register-cache-timestamp',
  MEMBERSHIP_ID: 'register-membership-id',
  SUBMISSION_TIMESTAMP: 'register-submission-timestamp',
  VERSION: 'register-cache-version',
} as const

// Configuration par défaut
const DEFAULT_CONFIG: CacheConfig = {
  expiry: 24 * 60 * 60 * 1000, // 24h
  submissionExpiry: 48 * 60 * 60 * 1000, // 48h
  debounceDelay: 500, // 500ms
  version: '2',
}

export class RegistrationCacheService implements IRegistrationCacheService {
  readonly name = 'RegistrationCacheService'
  private config: CacheConfig

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  isExpired(): boolean {
    const timestamp = localStorage.getItem(CACHE_KEYS.TIMESTAMP)
    if (!timestamp) return true

    const savedTime = parseInt(timestamp, 10)
    return Date.now() - savedTime > this.config.expiry
  }

  isSubmissionExpired(): boolean {
    const timestamp = localStorage.getItem(CACHE_KEYS.SUBMISSION_TIMESTAMP)
    if (!timestamp) return true

    const savedTime = parseInt(timestamp, 10)
    return Date.now() - savedTime > this.config.submissionExpiry
  }

  saveFormData(data: Partial<RegisterFormData>): void {
    try {
      // Nettoyer les données avant de sauvegarder
      const cleanData = { ...data }
      if ('insurance' in cleanData) {
        delete (cleanData as any).insurance
      }

      localStorage.setItem(CACHE_KEYS.FORM_DATA, JSON.stringify(cleanData))
      localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString())
      localStorage.setItem(CACHE_KEYS.VERSION, this.config.version)
    } catch (error) {
      console.warn('[RegistrationCacheService] Erreur lors de la sauvegarde du cache:', error)
    }
  }

  loadFormData(): Partial<RegisterFormData> | null {
    try {
      if (this.isExpired()) {
        this.clearAll()
        return null
      }

      // Vérifier la version du cache
      const cachedVersion = localStorage.getItem(CACHE_KEYS.VERSION)
      if (cachedVersion !== this.config.version) {
        console.warn('[RegistrationCacheService] Version du cache obsolète, nettoyage en cours...')
        this.clearAll()
        return null
      }

      const data = localStorage.getItem(CACHE_KEYS.FORM_DATA)
      if (data) {
        const parsedData = JSON.parse(data)
        // Nettoyer les données obsolètes (insurance)
        if (parsedData.insurance) {
          delete parsedData.insurance
          console.warn('[RegistrationCacheService] Suppression de la section insurance obsolète du cache')
        }
        return parsedData
      }
      return null
    } catch (error) {
      console.warn('[RegistrationCacheService] Erreur lors du chargement du cache:', error)
      this.clearAll()
      return null
    }
  }

  saveCurrentStep(step: number): void {
    localStorage.setItem(CACHE_KEYS.CURRENT_STEP, step.toString())
  }

  loadCurrentStep(): number {
    const step = localStorage.getItem(CACHE_KEYS.CURRENT_STEP)
    return step ? parseInt(step, 10) : 1
  }

  saveCompletedSteps(steps: Set<number>): void {
    localStorage.setItem(CACHE_KEYS.COMPLETED_STEPS, JSON.stringify([...steps]))
  }

  loadCompletedSteps(): Set<number> {
    try {
      const steps = localStorage.getItem(CACHE_KEYS.COMPLETED_STEPS)
      return steps ? new Set(JSON.parse(steps)) : new Set()
    } catch {
      return new Set()
    }
  }

  saveSubmissionData(membershipId: string, userData: { firstName?: string; lastName?: string; civility?: string }): void {
    try {
      localStorage.setItem(CACHE_KEYS.MEMBERSHIP_ID, membershipId)
      localStorage.setItem(CACHE_KEYS.SUBMISSION_TIMESTAMP, Date.now().toString())
      localStorage.setItem('register-user-data', JSON.stringify(userData))
    } catch (error) {
      console.warn('[RegistrationCacheService] Erreur lors de la sauvegarde des données de soumission:', error)
    }
  }

  loadSubmissionData(): RegistrationSubmissionData | null {
    try {
      if (this.isSubmissionExpired()) {
        this.clearSubmissionData()
        return null
      }

      const membershipId = localStorage.getItem(CACHE_KEYS.MEMBERSHIP_ID)
      const userData = localStorage.getItem('register-user-data')
      const timestamp = localStorage.getItem(CACHE_KEYS.SUBMISSION_TIMESTAMP)

      if (membershipId && userData && timestamp) {
        return {
          membershipId,
          userData: JSON.parse(userData),
          timestamp: parseInt(timestamp, 10),
        }
      }
      return null
    } catch (error) {
      console.warn('[RegistrationCacheService] Erreur lors du chargement des données de soumission:', error)
      this.clearSubmissionData()
      return null
    }
  }

  hasCachedData(): boolean {
    return !this.isExpired() && !!localStorage.getItem(CACHE_KEYS.FORM_DATA)
  }

  hasValidSubmission(): boolean {
    return !this.isSubmissionExpired() && !!localStorage.getItem(CACHE_KEYS.MEMBERSHIP_ID)
  }

  clearFormDataOnly(): void {
    localStorage.removeItem(CACHE_KEYS.FORM_DATA)
    localStorage.removeItem(CACHE_KEYS.TIMESTAMP)
    localStorage.removeItem(CACHE_KEYS.CURRENT_STEP)
    localStorage.removeItem(CACHE_KEYS.COMPLETED_STEPS)
  }

  clearSubmissionData(): void {
    localStorage.removeItem(CACHE_KEYS.MEMBERSHIP_ID)
    localStorage.removeItem(CACHE_KEYS.SUBMISSION_TIMESTAMP)
    localStorage.removeItem('register-user-data')
  }

  clearAll(): void {
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
    localStorage.removeItem('register-user-data')
  }
}
