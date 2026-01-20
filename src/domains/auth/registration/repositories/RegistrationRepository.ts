/**
 * Implémentation du repository pour les opérations de registration
 * Utilise les fonctions existantes de membership.db.ts
 */

import { IRegistrationRepository } from './IRegistrationRepository'
import type { RegisterFormData } from '@/domains/auth/registration/entities'
import type { MembershipRequest } from '@/types/types'
import {
  createMembershipRequest,
  getMembershipRequestById,
  updateMembershipRequest,
} from '@/db/membership.db'

export class RegistrationRepository implements IRegistrationRepository {
  readonly name = 'RegistrationRepository'

  async create(data: RegisterFormData): Promise<string> {
    try {
      return await createMembershipRequest(data)
    } catch (error) {
      console.error('[RegistrationRepository] Erreur lors de la création:', error)
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la création de la demande d\'inscription'
      )
    }
  }

  async getById(id: string): Promise<MembershipRequest | null> {
    try {
      return await getMembershipRequestById(id)
    } catch (error) {
      console.error('[RegistrationRepository] Erreur lors de la récupération:', error)
      return null
    }
  }

  /**
   * Met à jour une demande d'inscription existante
   * 
   * ⚠️ DÉPRÉCIÉ pour les CORRECTIONS : 
   * Pour les corrections, utiliser la Cloud Function `submitCorrections` via `RegistrationService.updateRegistration(requestId, data, securityCode)`.
   * La Cloud Function garantit une transaction atomique et évite les race conditions.
   * 
   * Cette méthode reste utilisée pour d'autres cas d'usage non liés aux corrections.
   * 
   * @param id - ID de la demande (matricule)
   * @param data - Données partielles à mettre à jour
   * @returns true si la mise à jour réussit
   * @throws Error si la mise à jour échoue
   */
  async update(id: string, data: Partial<RegisterFormData>): Promise<boolean> {
    try {
      // updateMembershipRequest attend un RegisterFormData complet
      // On doit récupérer les données existantes et les fusionner
      const existing = await this.getById(id)
      if (!existing) {
        throw new Error(`Demande d'inscription ${id} introuvable`)
      }

      // Convertir MembershipRequest en RegisterFormData partiel
      const updatedData: RegisterFormData = {
        identity: {
          ...existing.identity,
          ...data.identity,
        },
        address: {
          ...existing.address,
          ...data.address,
        },
        company: {
          ...existing.company,
          ...data.company,
        },
        documents: {
          ...existing.documents,
          ...data.documents,
        },
      }

      return await updateMembershipRequest(id, updatedData)
    } catch (error) {
      console.error('[RegistrationRepository] Erreur lors de la mise à jour:', error)
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la mise à jour de la demande d\'inscription'
      )
    }
  }
}
