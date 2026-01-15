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
  markSecurityCodeAsUsed as dbMarkSecurityCodeAsUsed,
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

  async verifySecurityCode(requestId: string, code: string): Promise<boolean> {
    try {
      const request = await this.getById(requestId)
      if (!request) {
        return false
      }

      // Vérifier si le code correspond
      if (request.securityCode !== code) {
        return false
      }

      // Vérifier si le code a déjà été utilisé
      if (request.securityCodeUsed) {
        return false
      }

      // Vérifier l'expiration du code
      if (request.securityCodeExpiry) {
        const expiry = request.securityCodeExpiry instanceof Date
          ? request.securityCodeExpiry
          : (request.securityCodeExpiry as any)?.toDate
          ? (request.securityCodeExpiry as any).toDate()
          : new Date(request.securityCodeExpiry)
        
        if (expiry < new Date()) {
          return false
        }
      } else {
        // Pas de date d'expiration = code expiré
        return false
      }

      return true
    } catch (error) {
      console.error('[RegistrationRepository] Erreur lors de la vérification du code:', error)
      return false
    }
  }

  async markSecurityCodeAsUsed(requestId: string): Promise<boolean> {
    try {
      return await dbMarkSecurityCodeAsUsed(requestId)
    } catch (error) {
      console.error('[RegistrationRepository] Erreur lors du marquage du code:', error)
      return false
    }
  }
}
