/**
 * Interface du service principal de registration
 */

import type { RegisterFormData } from '@/domains/auth/registration/entities'
import type { StepValidationResult } from '@/domains/auth/registration/entities'

export interface IRegistrationService {
  readonly name: string

  /**
   * Soumet une nouvelle demande d'inscription
   * @param data - Données du formulaire
   * @returns L'ID de la demande créée (matricule)
   * @throws Error si la soumission échoue
   */
  submitRegistration(data: RegisterFormData): Promise<string>

  /**
   * Met à jour une demande d'inscription existante (correction)
   * @param requestId - ID de la demande (matricule)
   * @param data - Données du formulaire
   * @returns true si la mise à jour réussit
   * @throws Error si la mise à jour échoue
   */
  updateRegistration(requestId: string, data: RegisterFormData): Promise<boolean>

  /**
   * Valide une étape du formulaire
   * @param step - Numéro de l'étape (1-4)
   * @param data - Données de l'étape à valider
   * @returns Résultat de la validation avec les erreurs
   */
  validateStep(step: number, data: Partial<RegisterFormData>): Promise<StepValidationResult>

  /**
   * Vérifie un code de sécurité pour une demande de correction
   * @param requestId - ID de la demande (matricule)
   * @param code - Code de sécurité à vérifier
   * @returns true si le code est valide
   */
  verifySecurityCode(requestId: string, code: string): Promise<boolean>

  /**
   * Charge les données d'une demande pour correction
   * @param requestId - ID de la demande (matricule)
   * @returns Les données du formulaire ou null si non trouvée
   */
  loadRegistrationForCorrection(requestId: string): Promise<RegisterFormData | null>
}
