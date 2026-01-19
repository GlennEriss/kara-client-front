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
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/firebase/app'

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

  async updateRegistration(requestId: string, data: RegisterFormData, securityCode?: string): Promise<boolean> {
    // Si un securityCode est fourni, cela signifie que c'est une soumission de corrections
    // Dans ce cas, on doit appeler la Cloud Function submitCorrections (transaction atomique)
    if (securityCode) {
      try {
        const functions = getFunctions(app)
        const submitCorrectionsCF = httpsCallable<{
          requestId: string
          securityCode: string
          formData: RegisterFormData
        }, {
          success: boolean
        }>(functions, 'submitCorrections')

        const result = await submitCorrectionsCF({
          requestId,
          securityCode,
          formData: data,
        })

        return result.data.success
      } catch (error: any) {
        console.error('[RegistrationService] Erreur lors de la soumission des corrections:', error)
        
        // Extraire le message d'erreur de Firebase Functions
        let errorMessage = 'Erreur lors de la soumission des corrections'
        
        if (error?.code === 'functions/not-found') {
          errorMessage = 'La fonction submitCorrections n\'est pas disponible. Veuillez contacter l\'administrateur.'
        } else if (error?.code === 'functions/unauthenticated') {
          errorMessage = 'Vous devez être authentifié pour soumettre des corrections.'
        } else if (error?.code === 'functions/permission-denied') {
          errorMessage = 'Vous n\'avez pas la permission de soumettre des corrections.'
        } else if (error?.message) {
          // Extraire le message d'erreur de la Cloud Function
          errorMessage = error.message
        } else if (error?.details) {
          errorMessage = error.details
        }
        
        throw new Error(errorMessage)
      }
    }

    // Sinon, comportement normal (mise à jour sans code de sécurité)
    // Note: Ce cas est rare mais peut être utilisé pour d'autres mises à jour
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

  async verifySecurityCode(requestId: string, code: string): Promise<{
    isValid: boolean
    reason?: string
    requestData?: {
      reviewNote?: string
      [key: string]: any
    }
  }> {
    try {
      // Valider le format du code (6 chiffres)
      if (!code || !/^\d{6}$/.test(code)) {
        return {
          isValid: false,
          reason: 'FORMAT_INVALID',
        }
      }

      // Appeler la Cloud Function verifySecurityCode (transaction atomique)
      const functions = getFunctions(app)
      const verifySecurityCodeCF = httpsCallable<{ requestId: string; code: string }, {
        isValid: boolean
        reason?: string
        requestData?: any
      }>(functions, 'verifySecurityCode')

      const result = await verifySecurityCodeCF({ requestId, code })

      return {
        isValid: result.data.isValid,
        reason: result.data.reason,
        requestData: result.data.requestData,
      }
    } catch (error) {
      console.error('[RegistrationService] Erreur lors de la vérification du code:', error)
      
      // En cas d'erreur, retourner invalide avec la raison
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      
      // Si c'est une erreur Firebase Functions, extraire la raison
      if (errorMessage.includes('Code de sécurité')) {
        return {
          isValid: false,
          reason: 'CODE_INCORRECT',
        }
      }
      
      if (errorMessage.includes('expiré') || errorMessage.includes('expired')) {
        return {
          isValid: false,
          reason: 'CODE_EXPIRED',
        }
      }
      
      if (errorMessage.includes('déjà utilisé') || errorMessage.includes('already used')) {
        return {
          isValid: false,
          reason: 'CODE_ALREADY_USED',
        }
      }
      
      return {
        isValid: false,
        reason: 'UNKNOWN_ERROR',
      }
    }
  }

  async loadRegistrationForCorrection(requestId: string): Promise<RegisterFormData | null> {
    try {
      const request = await this.repository.getById(requestId)
      if (!request) {
        return null
      }

      // Vérifier que le statut est 'under_review'
      if (request.status !== 'under_review') {
        console.warn(`[RegistrationService] La demande ${requestId} n'est pas en statut 'under_review'. Statut actuel: ${request.status}`)
        return null
      }

      // Utiliser les URLs directement si disponibles, sinon utiliser les data URLs
      // Les composants géreront l'affichage des URLs Firebase Storage
      const photo = typeof request.identity.photo === 'string' && request.identity.photo.startsWith('data:')
        ? request.identity.photo
        : request.identity.photoURL || (typeof request.identity.photo === 'string' ? request.identity.photo : undefined)

      const documentPhotoFront = typeof request.documents.documentPhotoFront === 'string' && request.documents.documentPhotoFront.startsWith('data:')
        ? request.documents.documentPhotoFront
        : request.documents.documentPhotoFrontURL || (typeof request.documents.documentPhotoFront === 'string' ? request.documents.documentPhotoFront : undefined)

      const documentPhotoBack = typeof request.documents.documentPhotoBack === 'string' && request.documents.documentPhotoBack.startsWith('data:')
        ? request.documents.documentPhotoBack
        : request.documents.documentPhotoBackURL || (typeof request.documents.documentPhotoBack === 'string' ? request.documents.documentPhotoBack : undefined)

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
          photo: photo,
          photoURL: request.identity.photoURL,
          photoPath: request.identity.photoPath,
        },
        address: request.address,
        company: request.company,
        documents: {
          identityDocument: request.documents.identityDocument,
          identityDocumentNumber: request.documents.identityDocumentNumber,
          documentPhotoFront: documentPhotoFront,
          documentPhotoBack: documentPhotoBack,
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
