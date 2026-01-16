/**
 * Interface du service de cache pour le formulaire d'inscription
 */

import type { RegisterFormData, RegistrationSubmissionData } from '@/domains/auth/registration/entities'

export interface IRegistrationCacheService {
  readonly name: string

  /**
   * Sauvegarde les données du formulaire dans le cache
   */
  saveFormData(data: Partial<RegisterFormData>): void

  /**
   * Charge les données du formulaire depuis le cache
   * @returns Les données du cache ou null si expiré/inexistant
   */
  loadFormData(): Partial<RegisterFormData> | null

  /**
   * Sauvegarde l'étape actuelle
   */
  saveCurrentStep(step: number): void

  /**
   * Charge l'étape actuelle depuis le cache
   */
  loadCurrentStep(): number

  /**
   * Sauvegarde les étapes complétées
   */
  saveCompletedSteps(steps: Set<number>): void

  /**
   * Charge les étapes complétées depuis le cache
   */
  loadCompletedSteps(): Set<number>

  /**
   * Sauvegarde les données de soumission
   */
  saveSubmissionData(membershipId: string, userData: { firstName?: string; lastName?: string; civility?: string }): void

  /**
   * Charge les données de soumission depuis le cache
   */
  loadSubmissionData(): RegistrationSubmissionData | null

  /**
   * Vérifie si le cache est expiré
   */
  isExpired(): boolean

  /**
   * Vérifie si les données de soumission sont expirées
   */
  isSubmissionExpired(): boolean

  /**
   * Vérifie si des données sont en cache
   */
  hasCachedData(): boolean

  /**
   * Vérifie si une soumission valide existe
   */
  hasValidSubmission(): boolean

  /**
   * Nettoie uniquement les données du formulaire (garde les données de soumission)
   */
  clearFormDataOnly(): void

  /**
   * Nettoie uniquement les données de soumission
   */
  clearSubmissionData(): void

  /**
   * Nettoie tout le cache
   */
  clearAll(): void
}
