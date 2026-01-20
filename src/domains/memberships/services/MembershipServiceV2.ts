/**
 * Service métier V2 pour Membership Requests
 * 
 * Implémentation propre avec TDD, respectant les diagrammes de séquence
 * et la logique métier de l'application.
 */

import { MembershipRepositoryV2 } from '../repositories/MembershipRepositoryV2'
import { generateSecurityCode, calculateCodeExpiry } from '../utils/securityCode'
import { generateWhatsAppUrl } from '../utils/whatsappUrl'
import { AdminRepository } from '@/repositories/admins/AdminRepository'
import { NotificationService } from '@/services/notifications/NotificationService'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/firebase/app'
import { generateCredentialsPDF, downloadPDF, formatCredentialsFilename } from '@/utils/pdfGenerator'
import type {
  IMembershipService,
  ApproveMembershipRequestParams,
  RejectMembershipRequestParams,
  RequestCorrectionsParams,
  ProcessPaymentParams,
} from './interfaces/IMembershipService'
import { MEMBERSHIP_REQUEST_VALIDATION, type PaymentMode } from '@/constantes/membership-requests'

export class MembershipServiceV2 implements IMembershipService {
  private static instance: MembershipServiceV2
  private repository: MembershipRepositoryV2
  private adminRepository: AdminRepository
  private notificationService: NotificationService

  private constructor(repository?: MembershipRepositoryV2, adminRepository?: AdminRepository, notificationService?: NotificationService) {
    this.repository = repository || MembershipRepositoryV2.getInstance()
    this.adminRepository = adminRepository || new AdminRepository()
    this.notificationService = notificationService || ServiceFactory.getNotificationService()
  }

  static getInstance(repository?: MembershipRepositoryV2, adminRepository?: AdminRepository, notificationService?: NotificationService): MembershipServiceV2 {
    if (!MembershipServiceV2.instance) {
      MembershipServiceV2.instance = new MembershipServiceV2(repository, adminRepository, notificationService)
    }
    // En test, permettre de réinitialiser avec un nouveau repository
    if ((repository || adminRepository || notificationService) && process.env.NODE_ENV === 'test') {
      MembershipServiceV2.instance = new MembershipServiceV2(repository, adminRepository, notificationService)
    }
    return MembershipServiceV2.instance
  }

  async approveMembershipRequest(params: ApproveMembershipRequestParams): Promise<void> {
    const { requestId, adminId, membershipType, companyId, professionId, adhesionPdfURL } = params

    // Récupérer la demande
    const request = await this.repository.getById(requestId)
    if (!request) {
      throw new Error(`Demande d'adhésion ${requestId} introuvable`)
    }

    // ==================== VALIDATIONS ====================
    
    // Vérifier que la demande est payée
    if (!request.isPaid) {
      throw new Error('La demande doit être payée avant approbation')
    }

    // Vérifier que le statut permet l'approbation
    if (request.status !== 'pending' && request.status !== 'under_review') {
      throw new Error(`Statut invalide pour approbation: ${request.status}`)
    }

    // Vérifier que le type de membre est fourni
    if (!membershipType || !['adherant', 'bienfaiteur', 'sympathisant'].includes(membershipType)) {
      throw new Error('Le type de membre est requis et doit être valide')
    }

    // Vérifier que le PDF d'adhésion est fourni
    if (!adhesionPdfURL || typeof adhesionPdfURL !== 'string') {
      throw new Error('Le PDF d\'adhésion est obligatoire')
    }

    // ==================== FLUX PRINCIPAL ====================
    
    // Appeler la Cloud Function approveMembershipRequest (transaction atomique)
    const functions = getFunctions(app)
    const approveMembershipRequestCF = httpsCallable<
      {
        requestId: string
        adminId: string
        membershipType: 'adherant' | 'bienfaiteur' | 'sympathisant'
        companyId?: string | null
        professionId?: string | null
        adhesionPdfURL: string
      },
      {
        success: boolean
        matricule: string
        email: string
        password: string
        subscriptionId: string
        companyId?: string | null
        professionId?: string | null
      }
    >(functions, 'approveMembershipRequest')

    const result = await approveMembershipRequestCF({
      requestId,
      adminId,
      membershipType,
      companyId: companyId || null,
      professionId: professionId || null,
      adhesionPdfURL,
    })

    if (!result.data.success) {
      throw new Error('Erreur lors de l\'approbation de la demande d\'adhésion')
    }

    // Générer et télécharger le PDF des identifiants de connexion
    try {
      const pdfBlob = await generateCredentialsPDF({
        firstName: request.identity.firstName,
        lastName: request.identity.lastName,
        matricule: result.data.matricule,
        email: result.data.email,
        password: result.data.password,
      })

      const filename = formatCredentialsFilename(result.data.matricule)
      downloadPDF(pdfBlob, filename)
    } catch (error) {
      // Ne pas bloquer le processus d'approbation si le PDF échoue
      console.error('[MembershipServiceV2] Erreur lors de la génération du PDF des identifiants:', error)
    }
  }

  async rejectMembershipRequest(params: RejectMembershipRequestParams): Promise<void> {
    const { requestId, adminId, reason } = params

    // ==================== VALIDATIONS ====================
    
    // Vérifier le motif de rejet
    if (!reason || reason.trim().length === 0) {
      throw new Error('Un motif de rejet est requis')
    }

    // Vérifier la longueur minimale
    const minLength = 10
    if (reason.trim().length < minLength) {
      throw new Error(`Le motif de rejet doit contenir au moins ${minLength} caractères`)
    }

    // Vérifier la longueur maximale
    const maxLength = MEMBERSHIP_REQUEST_VALIDATION.MAX_REJECTION_REASON_LENGTH
    if (reason.length > maxLength) {
      throw new Error(`Le motif de rejet ne peut pas dépasser ${maxLength} caractères`)
    }

    // Récupérer la demande
    const request = await this.repository.getById(requestId)
    if (!request) {
      throw new Error(`Demande d'adhésion ${requestId} introuvable`)
    }

    // ==================== FLUX PRINCIPAL ====================
    
    // Mettre à jour le statut
    await this.repository.updateStatus(requestId, 'rejected', {
      motifReject: reason.trim(),
      processedBy: adminId,
      processedAt: new Date(),
    })

    // TODO: Envoyer notification
    // Note: Les documents uploadés ne sont PAS supprimés (conforme aux règles métier)
  }

  async requestCorrections(params: RequestCorrectionsParams): Promise<{
    securityCode: string
    whatsAppUrl?: string
  }> {
    const { requestId, adminId, corrections, sendWhatsApp } = params

    // ==================== VALIDATIONS ====================
    
    // Vérifier la liste de corrections
    if (!corrections || corrections.length === 0) {
      throw new Error('Au moins une correction est requise')
    }

    // Vérifier que chaque correction n'est pas vide
    for (const correction of corrections) {
      if (!correction || correction.trim().length === 0) {
        throw new Error('Chaque correction doit contenir au moins un caractère')
      }
    }

    // Récupérer la demande
    const request = await this.repository.getById(requestId)
    if (!request) {
      throw new Error(`Demande d'adhésion ${requestId} introuvable`)
    }

    // ==================== FLUX PRINCIPAL ====================
    
    // Générer le code de sécurité
    const securityCode = generateSecurityCode()
    const expiryDate = calculateCodeExpiry(48) // 48h

    // Joindre les corrections en une seule chaîne
    const correctionsText = corrections.join('\n')

    // Mettre à jour le statut
    await this.repository.updateStatus(requestId, 'under_review', {
      reviewNote: correctionsText,
      securityCode,
      securityCodeExpiry: expiryDate,
      securityCodeUsed: false,
      processedBy: adminId,
    })

    // Générer l'URL WhatsApp si demandé
    let whatsAppUrl: string | undefined
    if (sendWhatsApp && request.identity.contacts && request.identity.contacts[0]) {
      const phoneNumber = request.identity.contacts[0]
      const message = `Bonjour ${request.identity.firstName},\n\nVotre demande d'adhésion nécessite des corrections:\n\n${correctionsText}\n\nUtilisez le code de sécurité suivant pour accéder aux corrections: ${securityCode}`
      whatsAppUrl = generateWhatsAppUrl(phoneNumber, message)
    }

    // Créer notification NOTIF-CORR-001 (Corrections demandées) - Autres admins
    try {
      const admin = await this.adminRepository.getAdminById(adminId)
      const adminName = admin ? `${admin.firstName} ${admin.lastName}`.trim() : adminId
      const memberName = `${request.identity.firstName} ${request.identity.lastName}`.trim()

      await this.notificationService.createNotification({
        module: 'memberships',
        entityId: requestId,
        type: 'corrections_requested',
        title: 'Corrections demandées',
        message: `${adminName} a demandé des corrections pour la demande de ${memberName}`,
        metadata: {
          requestId,
          memberName,
          adminName,
          adminId,
          securityCode,
          expiryDate: expiryDate.toISOString(),
          correctionsCount: corrections.length,
        },
      })
    } catch (error) {
      // Erreur lors de la création de la notification - continue sans bloquer
      console.error('[MembershipServiceV2] Erreur lors de la création de la notification:', error)
    }

    return {
      securityCode,
      whatsAppUrl,
    }
  }

  async renewSecurityCode(requestId: string, adminId: string): Promise<{
    success: boolean
    newCode: string
    newExpiry: Date
  }> {
    // ==================== VALIDATIONS ====================
    
    // Récupérer la demande pour validation
    const request = await this.repository.getById(requestId)
    if (!request) {
      throw new Error(`Demande d'adhésion ${requestId} introuvable`)
    }

    // Vérifier que la demande est en statut 'under_review'
    if (request.status !== 'under_review') {
      throw new Error(`La demande doit être en statut 'under_review' pour régénérer le code. Statut actuel: ${request.status}`)
    }

    // ==================== FLUX PRINCIPAL ====================
    
    // Appeler la Cloud Function renewSecurityCode (transaction atomique)
    const functions = getFunctions(app)
    const renewSecurityCodeCF = httpsCallable<{ requestId: string; adminId: string }, {
      success: boolean
      newCode: string
      newExpiry: string
    }>(functions, 'renewSecurityCode')

    const result = await renewSecurityCodeCF({ requestId, adminId })

    if (!result.data.success) {
      throw new Error('Erreur lors de la régénération du code de sécurité')
    }

    const newCode = result.data.newCode
    const newExpiry = new Date(result.data.newExpiry)

    // Créer notification NOTIF-CORR-005 (Code régénéré) - Autres admins
    try {
      const admin = await this.adminRepository.getAdminById(adminId)
      const adminName = admin ? `${admin.firstName} ${admin.lastName}`.trim() : adminId
      const memberName = `${request.identity.firstName} ${request.identity.lastName}`.trim()

      await this.notificationService.createNotification({
        module: 'memberships',
        entityId: requestId,
        type: 'security_code_renewed',
        title: 'Code de correction régénéré',
        message: `${adminName} a régénéré le code de sécurité pour la demande de ${memberName}`,
        metadata: {
          requestId,
          adminName,
          adminId,
          memberName,
          newCode,
          newExpiry: newExpiry.toISOString(),
        },
      })
    } catch (error) {
      // Erreur lors de la création de la notification - continue sans bloquer
      console.error('[MembershipServiceV2] Erreur lors de la création de la notification:', error)
    }

    return {
      success: true,
      newCode,
      newExpiry,
    }
  }

  async processPayment(params: ProcessPaymentParams): Promise<void> {
    const { requestId, adminId, paymentInfo } = params

    // ==================== VALIDATIONS ====================
    
    // Vérifier le montant
    if (!paymentInfo.amount || paymentInfo.amount <= 0) {
      throw new Error('Le montant doit être positif')
    }

    // Vérifier le mode de paiement (utilise les valeurs des constantes)
    const validModes: Array<'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer' | 'other'> = [
      'airtel_money',
      'mobicash',
      'cash',
      'bank_transfer',
      'other',
    ]

    if (!validModes.includes(paymentInfo.mode as any)) {
      throw new Error(`Mode de paiement invalide: ${paymentInfo.mode}. Modes autorisés: ${validModes.join(', ')}`)
    }

    // Vérifier que l'heure est fournie (obligatoire)
    if (!paymentInfo.time || paymentInfo.time.trim() === '') {
      throw new Error('L\'heure de versement est obligatoire')
    }

    // Vérifier que paymentMethodOther est fourni si mode = 'other'
    if (paymentInfo.mode === 'other' && (!paymentInfo.paymentMethodOther || paymentInfo.paymentMethodOther.trim() === '')) {
      throw new Error('Veuillez préciser le mode de paiement pour "Autre"')
    }

    // Vérifier que withFees est défini si mode = airtel_money ou mobicash
    const mobileMoneyModes: PaymentMode[] = ['airtel_money', 'mobicash']
    if (mobileMoneyModes.includes(paymentInfo.mode) && paymentInfo.withFees === undefined) {
      throw new Error('Veuillez indiquer si le paiement est avec ou sans frais pour Airtel Money/Mobicash')
    }

    // Récupérer la demande
    const request = await this.repository.getById(requestId)
    if (!request) {
      throw new Error(`Demande d'adhésion ${requestId} introuvable`)
    }

    // Vérifier que la demande n'est pas déjà payée
    if (request.isPaid) {
      throw new Error('Cette demande est déjà payée')
    }

    // ==================== FLUX PRINCIPAL ====================
    
    // Récupérer les informations de l'admin pour la traçabilité
    const admin = await this.adminRepository.getAdminById(adminId)
    
    // VALIDATION DE SÉCURITÉ : L'admin doit exister et être valide
    if (!admin) {
      throw new Error(`SÉCURITÉ : L'administrateur avec l'ID "${adminId}" n'existe pas dans la base de données. Enregistrement du paiement refusé.`)
    }
    
    const adminName = `${admin.firstName} ${admin.lastName}`.trim()
    
    // VALIDATION DE SÉCURITÉ : Le nom de l'admin ne doit pas être vide ou "Admin inconnu"
    if (!adminName || adminName === '' || adminName === 'Admin inconnu') {
      throw new Error(`SÉCURITÉ : Impossible de déterminer l'identité de l'administrateur (ID: ${adminId}). Enregistrement du paiement refusé pour des raisons de sécurité.`)
    }
    
    // Date d'enregistrement (maintenant)
    const recordedAt = new Date()
    
    // Marquer comme payé avec traçabilité complète
    await this.repository.markAsPaid(requestId, {
      ...paymentInfo,
      date: paymentInfo.date || new Date().toISOString(),
      recordedBy: adminId,
      recordedByName: adminName,
      recordedAt,
    })

    // TODO: Créer un reçu de paiement
    // TODO: Envoyer notification
  }
}
