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

  private constructor(repository?: MembershipRepositoryV2, adminRepository?: AdminRepository) {
    this.repository = repository || MembershipRepositoryV2.getInstance()
    this.adminRepository = adminRepository || new AdminRepository()
  }

  static getInstance(repository?: MembershipRepositoryV2, adminRepository?: AdminRepository): MembershipServiceV2 {
    if (!MembershipServiceV2.instance) {
      MembershipServiceV2.instance = new MembershipServiceV2(repository, adminRepository)
    }
    // En test, permettre de réinitialiser avec un nouveau repository
    if ((repository || adminRepository) && process.env.NODE_ENV === 'test') {
      MembershipServiceV2.instance = new MembershipServiceV2(repository, adminRepository)
    }
    return MembershipServiceV2.instance
  }

  async approveMembershipRequest(params: ApproveMembershipRequestParams): Promise<void> {
    const { requestId, adminId } = params

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

    // ==================== FLUX PRINCIPAL ====================
    // Note: L'implémentation complète nécessiterait Firebase Admin Auth,
    // création de user, abonnement, PDF, etc.
    // Pour l'instant, on se concentre sur la mise à jour du statut
    
    // Mettre à jour le statut de la demande
    await this.repository.updateStatus(requestId, 'approved', {
      processedBy: adminId,
      processedAt: new Date(),
    })

    // TODO: Créer utilisateur Firebase Auth
    // TODO: Créer document user dans Firestore
    // TODO: Créer abonnement initial
    // TODO: Générer et sauvegarder PDF d'adhésion
    // TODO: Envoyer notification
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

    // TODO: Envoyer notification

    return {
      securityCode,
      whatsAppUrl,
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
