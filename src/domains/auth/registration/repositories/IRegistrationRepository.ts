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
   * 
   * ⚠️ Note : Pour les corrections, utiliser la Cloud Function `submitCorrections` 
   * via `RegistrationService.updateRegistration(requestId, data, securityCode)`.
   * La Cloud Function garantit une transaction atomique et évite les race conditions.
   * 
   * Cette méthode reste utilisée pour d'autres cas d'usage non liés aux corrections.
   * 
   * @param id - ID de la demande (matricule)
   * @param data - Données partielles à mettre à jour
   * @returns true si la mise à jour réussit
   * @throws Error si la mise à jour échoue
   */
  update(id: string, data: Partial<RegisterFormData>): Promise<boolean>
}
