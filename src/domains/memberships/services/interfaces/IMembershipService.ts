/**
 * Interface du Service métier pour Membership Requests V2
 */

import type { MembershipRequest } from '../../entities/MembershipRequest'
import type { PaymentInfo } from '../../entities/MembershipRequest'

export interface ApproveMembershipRequestParams {
  requestId: string
  adminId: string
  membershipType: 'adherant' | 'bienfaiteur' | 'sympathisant'
  companyId?: string | null
  professionId?: string | null
  adhesionPdfURL: string  // Obligatoire
}

export interface RejectMembershipRequestParams {
  requestId: string
  adminId: string
  reason?: string
  motifReject?: string
}

export interface ReopenMembershipRequestParams {
  requestId: string
  adminId: string
  reason: string
}

export interface RequestCorrectionsParams {
  requestId: string
  adminId: string
  corrections: string[]
  sendWhatsApp?: boolean
}

export interface ProcessPaymentParams {
  requestId: string
  adminId: string
  paymentInfo: PaymentInfo
}

export interface IMembershipService {
  /**
   * Approuve une demande d'adhésion
   * Crée un compte utilisateur, un membre, un abonnement et génère le PDF
   */
  approveMembershipRequest(params: ApproveMembershipRequestParams): Promise<void>

  /**
   * Rejette une demande d'adhésion
   */
  rejectMembershipRequest(params: RejectMembershipRequestParams): Promise<void>

  /**
   * Réouvre un dossier rejeté pour le remettre en examen
   */
  reopenMembershipRequest(params: ReopenMembershipRequestParams): Promise<void>

  /**
   * Demande des corrections à un demandeur
   * Génère un code de sécurité et envoie une notification (optionnel WhatsApp)
   */
  requestCorrections(params: RequestCorrectionsParams): Promise<{
    securityCode: string
    whatsAppUrl?: string
  }>

  /**
   * Traite un paiement pour une demande d'adhésion
   */
  processPayment(params: ProcessPaymentParams): Promise<void>

  /**
   * Régénère le code de sécurité pour une demande en correction
   * @param requestId - ID de la demande
   * @param adminId - ID de l'admin qui régénère le code
   * @returns Nouveau code de sécurité et date d'expiration
   */
  renewSecurityCode(requestId: string, adminId: string): Promise<{
    success: boolean
    newCode: string
    newExpiry: Date
  }>
}
