/**
 * Service principal pour la gestion des inscriptions
 * Orchestre les opérations entre le repository et le cache
 */

import { IRegistrationService } from './IRegistrationService'
import type { RegisterFormData } from '@/domains/auth/registration/entities'
import type { StepValidationResult } from '@/domains/auth/registration/entities'
import { IRegistrationRepository } from '../repositories/IRegistrationRepository'
import { STEP_TO_SECTION_MAP } from '@/domains/auth/registration/entities/registration-form.types'
import { stepSchemas } from '@/schemas/schemas'
import { z } from 'zod'

export class RegistrationService implements IRegistrationService {
  readonly name = 'RegistrationService'

  constructor(private repository: IRegistrationRepository) {}

  async submitRegistration(data: RegisterFormData): Promise<string> {
    try {
      return await this.repository.create(data)
    } catch (error) {
      console.error('[RegistrationService] Erreur lors de la soumission:', error)
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la soumission de la demande d\'inscription'
      )
    }
  }

  async updateRegistration(requestId: string, data: RegisterFormData): Promise<boolean> {
    try {
      return await this.repository.update(requestId, data)
    } catch (error) {
      console.error('[RegistrationService] Erreur lors de la mise à jour:', error)
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la mise à jour de la demande d\'inscription'
      )
    }
  }

  async validateStep(step: number, data: Partial<RegisterFormData>): Promise<StepValidationResult> {
    const sectionKey = STEP_TO_SECTION_MAP[step as keyof typeof STEP_TO_SECTION_MAP]
    const schema = stepSchemas[step as keyof typeof stepSchemas]

    if (!sectionKey || !schema) {
      return {
        isValid: false,
        errors: { _form: `Étape ${step} invalide` },
      }
    }

    try {
      const stepData = data[sectionKey]
      if (!stepData) {
        return {
          isValid: false,
          errors: { _form: `Données de l'étape ${step} manquantes` },
        }
      }

      await schema.parseAsync(stepData)
      return {
        isValid: true,
        errors: {},
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        error.issues.forEach((issue) => {
          const path = issue.path.join('.')
          errors[path] = issue.message
        })
        return {
          isValid: false,
          errors,
        }
      }

      return {
        isValid: false,
        errors: { _form: 'Erreur de validation inattendue' },
      }
    }
  }

  async verifySecurityCode(requestId: string, code: string): Promise<boolean> {
    try {
      return await this.repository.verifySecurityCode(requestId, code)
    } catch (error) {
      console.error('[RegistrationService] Erreur lors de la vérification du code:', error)
      return false
    }
  }

  async loadRegistrationForCorrection(requestId: string): Promise<RegisterFormData | null> {
    try {
      const request = await this.repository.getById(requestId)
      if (!request) {
        return null
      }

      // Convertir MembershipRequest en RegisterFormData
      return {
        identity: {
          civility: request.identity.civility,
          lastName: request.identity.lastName,
          firstName: request.identity.firstName,
          birthDate: request.identity.birthDate,
          birthPlace: request.identity.birthPlace,
          birthCertificateNumber: request.identity.birthCertificateNumber,
          prayerPlace: request.identity.prayerPlace,
          religion: request.identity.religion,
          contacts: request.identity.contacts,
          email: request.identity.email,
          gender: request.identity.gender,
          nationality: request.identity.nationality,
          maritalStatus: request.identity.maritalStatus,
          spouseLastName: request.identity.spouseLastName,
          spouseFirstName: request.identity.spouseFirstName,
          spousePhone: request.identity.spousePhone,
          intermediaryCode: request.identity.intermediaryCode,
          hasCar: request.identity.hasCar,
          photo: request.identity.photo,
          photoURL: request.identity.photoURL,
          photoPath: request.identity.photoPath,
        },
        address: request.address,
        company: request.company,
        documents: {
          identityDocument: request.documents.identityDocument,
          identityDocumentNumber: request.documents.identityDocumentNumber,
          documentPhotoFront: request.documents.documentPhotoFront,
          documentPhotoBack: request.documents.documentPhotoBack,
          expirationDate: request.documents.expirationDate,
          issuingPlace: request.documents.issuingPlace,
          issuingDate: request.documents.issuingDate,
          termsAccepted: request.documents.termsAccepted ?? false,
          documentPhotoFrontURL: request.documents.documentPhotoFrontURL,
          documentPhotoFrontPath: request.documents.documentPhotoFrontPath,
          documentPhotoBackURL: request.documents.documentPhotoBackURL,
          documentPhotoBackPath: request.documents.documentPhotoBackPath,
        },
      }
    } catch (error) {
      console.error('[RegistrationService] Erreur lors du chargement pour correction:', error)
      return null
    }
  }
}
