/**
 * Interface du repository pour les opérations de registration
 */

import { IRepository } from '@/repositories/IRepository'
import type { RegisterFormData } from '@/domains/auth/registration/entities'
import type { MembershipRequest } from '@/types/types'

export interface IRegistrationRepository extends IRepository {
  /**
   * Crée une nouvelle demande d'inscription
   * @param data - Données du formulaire d'inscription
   * @returns L'ID de la demande créée (matricule)
   * @throws Error si la création échoue
   */
  create(data: RegisterFormData): Promise<string>

  /**
   * Récupère une demande d'inscription par son ID
   * @param id - ID de la demande (matricule)
   * @returns La demande d'inscription ou null si non trouvée
   */
  getById(id: string): Promise<MembershipRequest | null>

  /**
   * Met à jour une demande d'inscription existante
   * @param id - ID de la demande (matricule)
   * @param data - Données partielles à mettre à jour
   * @returns true si la mise à jour réussit
   * @throws Error si la mise à jour échoue
   */
  update(id: string, data: Partial<RegisterFormData>): Promise<boolean>

  /**
   * Vérifie un code de sécurité pour une demande de correction
   * @param requestId - ID de la demande (matricule)
   * @param code - Code de sécurité à vérifier
   * @returns true si le code est valide et non expiré
   */
  verifySecurityCode(requestId: string, code: string): Promise<boolean>

  /**
   * Marque un code de sécurité comme utilisé
   * @param requestId - ID de la demande (matricule)
   * @returns true si le marquage réussit
   */
  markSecurityCodeAsUsed(requestId: string): Promise<boolean>
}
