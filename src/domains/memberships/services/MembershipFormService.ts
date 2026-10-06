/**
 * Service de domaine pour la gestion du formulaire d'adhésion
 * 
 * Centralise la logique de soumission, corrections et brouillons
 */

import { withResolvedBeneficiary } from '@/constantes/beneficiary'
import type { RegisterFormData } from '@/types/types'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/firebase/app'
import { MembershipRepositoryV2 } from '../repositories/MembershipRepositoryV2'
import { MembershipErrorHandler } from './MembershipErrorHandler'

/**
 * Résultat de la soumission d'une nouvelle demande
 */
export interface SubmitMembershipResult {
  success: boolean
  requestId: string | null
  error?: string
}

/**
 * Résultat de la soumission de corrections
 */
export interface SubmitCorrectionResult {
  success: boolean
  error?: string
}

/**
 * Clé localStorage pour les brouillons
 */
const DRAFT_STORAGE_KEY = 'membership-form-draft'
const DRAFT_TIMESTAMP_KEY = 'membership-form-draft-timestamp'
const DRAFT_EXPIRY_DAYS = 7 // Les brouillons expirent après 7 jours

export class MembershipFormService {
  private static instance: MembershipFormService
  private membershipRepository: MembershipRepositoryV2
  private errorHandler: MembershipErrorHandler

  private constructor() {
    this.membershipRepository = MembershipRepositoryV2.getInstance()
    this.errorHandler = MembershipErrorHandler.getInstance()
  }

  static getInstance(): MembershipFormService {
    if (!MembershipFormService.instance) {
      MembershipFormService.instance = new MembershipFormService()
    }
    return MembershipFormService.instance
  }

  /**
   * Soumet une nouvelle demande d'adhésion
   * 
   * @param formData Données du formulaire
   * @returns Résultat de la soumission avec l'ID de la demande créée
   */
  async submitNewMembership(formData: RegisterFormData): Promise<SubmitMembershipResult> {
    try {
      // Valider les données (les schémas Zod sont déjà validés côté formulaire)
      // Le prénom est optionnel selon le schéma, seul le nom est obligatoire
      if (!formData.identity.lastName || formData.identity.lastName.trim() === '') {
        const validationError = this.errorHandler.createValidationError('Le nom est obligatoire')
        return {
          success: false,
          requestId: null,
          error: this.errorHandler.formatForUI(validationError),
        }
      }

      if (!formData.documents.termsAccepted) {
        const validationError = this.errorHandler.createValidationError('Vous devez accepter les conditions d\'utilisation')
        return {
          success: false,
          requestId: null,
          error: this.errorHandler.formatForUI(validationError),
        }
      }

      // Créer la demande via le repository V2
      // Le repository gère l'upload des photos et documents
      console.log('📝 [MembershipFormService] Tentative de création de la demande avec les données:', {
        identity: {
          firstName: formData.identity.firstName,
          lastName: formData.identity.lastName,
          email: formData.identity.email,
          hasPhoto: !!formData.identity.photo
        },
        address: formData.address,
        company: formData.company,
        documents: {
          termsAccepted: formData.documents.termsAccepted,
          hasDocumentFront: !!formData.documents.documentPhotoFront,
          hasDocumentBack: !!formData.documents.documentPhotoBack
        }
      })

      // Ayant droit : le membre choisi, sinon INCONNU.
      const requestId = await this.membershipRepository.create({ ...formData, identity: withResolvedBeneficiary(formData.identity) })

      if (!requestId) {
        return {
          success: false,
          requestId: null,
          error: 'Échec de l\'enregistrement de la demande d\'adhésion',
        }
      }

      // Supprimer le brouillon après soumission réussie
      this.clearDraft()

      return {
        success: true,
        requestId,
      }
    } catch (error) {
      console.error('❌ [MembershipFormService] Erreur lors de la soumission:', error)
      console.error('   Type:', (error as any)?.constructor?.name)
      console.error('   Code:', (error as any)?.code)
      console.error('   Message:', (error as any)?.message)
      console.error('   Stack:', (error as any)?.stack)

      const normalizedError = this.errorHandler.normalizeError(error, 'submitNewMembership')
      console.error('   Erreur normalisée:', normalizedError)

      return {
        success: false,
        requestId: null,
        error: this.errorHandler.formatForUI(normalizedError),
      }
    }
  }

  /**
   * Met à jour une demande d'adhésion existante
   * 
   * @param requestId ID de la demande à modifier
   * @param formData Données du formulaire mises à jour
   * @returns Résultat de la mise à jour
   */
  async updateMembershipRequest(requestId: string, formData: RegisterFormData): Promise<SubmitMembershipResult> {
    try {
      // Valider que l'ID est fourni
      if (!requestId || requestId.trim() === '') {
        const validationError = this.errorHandler.createValidationError('L\'ID de la demande est requis')
        return {
          success: false,
          requestId: null,
          error: this.errorHandler.formatForUI(validationError),
        }
      }

      // Valider les données (mêmes règles que submitNewMembership)
      if (!formData.identity.lastName || formData.identity.lastName.trim() === '') {
        const validationError = this.errorHandler.createValidationError('Le nom est obligatoire')
        return {
          success: false,
          requestId: null,
          error: this.errorHandler.formatForUI(validationError),
        }
      }

      if (!formData.documents.termsAccepted) {
        const validationError = this.errorHandler.createValidationError('L\'acceptation des conditions doit rester valide')
        return {
          success: false,
          requestId: null,
          error: this.errorHandler.formatForUI(validationError),
        }
      }

      console.log('📝 [MembershipFormService] Tentative de mise à jour de la demande:', {
        requestId,
        identity: {
          firstName: formData.identity.firstName,
          lastName: formData.identity.lastName,
          email: formData.identity.email,
          hasPhoto: !!formData.identity.photo
        },
        address: formData.address,
        company: formData.company,
      })

      // Mettre à jour via le repository
      // Ayant droit : le membre choisi, sinon INCONNU.
      await this.membershipRepository.update(requestId, { ...formData, identity: withResolvedBeneficiary(formData.identity) })

      return {
        success: true,
        requestId,
      }
    } catch (error) {
      console.error('❌ [MembershipFormService] Erreur lors de la mise à jour:', error)
      console.error('   Type:', (error as any)?.constructor?.name)
      console.error('   Message:', (error as any)?.message)

      const normalizedError = this.errorHandler.normalizeError(error, 'updateMembershipRequest')
      console.error('   Erreur normalisée:', normalizedError)

      return {
        success: false,
        requestId: null,
        error: this.errorHandler.formatForUI(normalizedError),
      }
    }
  }

  /**
   * Soumet des corrections à une demande existante
   * 
   * @param formData Données du formulaire corrigées
   * @param requestId ID de la demande à corriger
   * @param securityCode Code de sécurité pour valider les corrections
   * @returns Résultat de la soumission
   */
  async submitCorrection(
    formData: RegisterFormData,
    requestId: string,
    securityCode: string
  ): Promise<SubmitCorrectionResult> {
    try {
      // Valider les paramètres
      if (!requestId) {
        const validationError = this.errorHandler.createValidationError('L\'ID de la demande est requis')
        return {
          success: false,
          error: this.errorHandler.formatForUI(validationError),
        }
      }

      if (!securityCode || securityCode.length !== 6) {
        const validationError = this.errorHandler.createValidationError('Le code de sécurité est invalide (doit contenir 6 chiffres)')
        return {
          success: false,
          error: this.errorHandler.formatForUI(validationError),
        }
      }

      // Appeler la Cloud Function submitCorrections (transaction atomique)
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
        // Ayant droit : le membre choisi, sinon INCONNU.
        formData: { ...formData, identity: withResolvedBeneficiary(formData.identity) },
      })

      if (!result.data.success) {
        const operationError = this.errorHandler.createOperationError('soumission des corrections')
        return {
          success: false,
          error: this.errorHandler.formatForUI(operationError),
        }
      }

      // Supprimer le brouillon après soumission réussie
      this.clearDraft()

      return {
        success: true,
      }
    } catch (error: any) {
      const normalizedError = this.errorHandler.normalizeError(error, 'submitCorrection')

      return {
        success: false,
        error: this.errorHandler.formatForUI(normalizedError),
      }
    }
  }

  /**
   * Sauvegarde un brouillon du formulaire dans localStorage
   * 
   * @param formData Données du formulaire à sauvegarder
   */
  saveDraft(formData: Partial<RegisterFormData>): void {
    try {
      // Nettoyer les données avant de sauvegarder (retirer les fichiers non sérialisables)
      const cleanData: Partial<RegisterFormData> = {
        ...formData,
      }

      // Retirer les fichiers (File objects) qui ne peuvent pas être sérialisés
      if (cleanData.identity?.photo && cleanData.identity.photo instanceof File) {
        // Garder seulement l'URL si elle existe, sinon retirer
        if (!cleanData.identity.photoURL) {
          delete cleanData.identity.photo
        }
      }

      if (cleanData.documents?.documentPhotoFront && cleanData.documents.documentPhotoFront instanceof File) {
        if (!cleanData.documents.documentPhotoFrontURL) {
          delete cleanData.documents.documentPhotoFront
        }
      }

      if (cleanData.documents?.documentPhotoBack && cleanData.documents.documentPhotoBack instanceof File) {
        if (!cleanData.documents.documentPhotoBackURL) {
          delete cleanData.documents.documentPhotoBack
        }
      }

      // Sauvegarder dans localStorage
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(cleanData))
      localStorage.setItem(DRAFT_TIMESTAMP_KEY, Date.now().toString())
    } catch (error) {
      console.warn('[MembershipFormService] Erreur lors de la sauvegarde du brouillon:', error)
      // Ne pas bloquer l'utilisateur si la sauvegarde échoue
    }
  }

  /**
   * Charge un brouillon depuis localStorage
   * 
   * @returns Données du formulaire sauvegardées ou null si aucun brouillon ou expiré
   */
  loadDraft(): Partial<RegisterFormData> | null {
    try {
      const draftData = localStorage.getItem(DRAFT_STORAGE_KEY)
      const timestampStr = localStorage.getItem(DRAFT_TIMESTAMP_KEY)

      if (!draftData || !timestampStr) {
        return null
      }

      // Vérifier si le brouillon a expiré
      const timestamp = parseInt(timestampStr, 10)
      const now = Date.now()
      const expiryTime = DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000

      if (now - timestamp > expiryTime) {
        // Brouillon expiré, le supprimer
        this.clearDraft()
        return null
      }

      // Parser les données
      const parsed = JSON.parse(draftData) as Partial<RegisterFormData>
      return parsed
    } catch (error) {
      console.warn('[MembershipFormService] Erreur lors du chargement du brouillon:', error)
      // En cas d'erreur, supprimer le brouillon corrompu
      this.clearDraft()
      return null
    }
  }

  /**
   * Vérifie si un brouillon existe et n'est pas expiré
   * 
   * @returns true si un brouillon valide existe
   */
  hasDraft(): boolean {
    return this.loadDraft() !== null
  }

  /**
   * Supprime le brouillon sauvegardé
   */
  clearDraft(): void {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
      localStorage.removeItem(DRAFT_TIMESTAMP_KEY)
    } catch (error) {
      console.warn('[MembershipFormService] Erreur lors de la suppression du brouillon:', error)
    }
  }

  /**
   * Récupère l'âge du brouillon en jours
   * 
   * @returns Nombre de jours depuis la sauvegarde ou null si aucun brouillon
   */
  getDraftAge(): number | null {
    try {
      const timestampStr = localStorage.getItem(DRAFT_TIMESTAMP_KEY)
      if (!timestampStr) {
        return null
      }

      const timestamp = parseInt(timestampStr, 10)
      // Vérifier si le parsing a échoué (NaN)
      if (isNaN(timestamp)) {
        return null
      }

      const now = Date.now()
      const ageMs = now - timestamp
      const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000))
      return ageDays
    } catch (error) {
      return null
    }
  }
}
