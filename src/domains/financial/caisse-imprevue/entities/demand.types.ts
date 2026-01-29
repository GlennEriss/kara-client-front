/**
 * Types et interfaces pour les Demandes Caisse Imprévue V2
 * 
 * Architecture domains-based avec traçabilité complète
 */

import type { EmergencyContactCI } from './subscription.types'

/**
 * Statut d'une demande Caisse Imprévue
 */
export type CaisseImprevueDemandStatus = 
  | 'PENDING'      // En attente
  | 'APPROVED'     // Acceptée
  | 'REJECTED'     // Refusée
  | 'CONVERTED'    // Convertie en contrat
  | 'REOPENED'     // Réouverte (après refus)

/**
 * Fréquence de paiement
 */
export type CaisseImprevuePaymentFrequency = 'DAILY' | 'MONTHLY'

/**
 * Interface principale pour une demande de contrat Caisse Imprévue V2
 * 
 * Format ID standardisé : MK_DEMANDE_CI_{4PremiersChiffresMatricule}_{DDMMYY}_{HHMM}
 * Exemple : MK_DEMANDE_CI_8438_270126_2219
 */
export interface CaisseImprevueDemand {
  // Identifiant
  id: string // Format: MK_DEMANDE_CI_{matricule}_{date}_{heure}
  
  // Informations du demandeur
  memberId: string
  memberFirstName: string
  memberLastName: string
  memberEmail?: string
  memberContacts?: string[]
  memberMatricule: string
  memberPhone?: string

  /** Texte de recherche normalisé (lastName firstName matricule) pour recherche par préfixe Firestore */
  searchableText?: string
  /** Variante prénom en premier — permet recherche "alain owono" */
  searchableTextFirstNameFirst?: string
  /** Variante matricule en premier — permet recherche "8438" */
  searchableTextMatriculeFirst?: string
  
  // Motif de la demande (obligatoire, min 10, max 500 caractères)
  cause: string
  
  // Informations du forfait sélectionné
  subscriptionCIID: string
  subscriptionCICode: string
  subscriptionCILabel?: string
  subscriptionCIAmountPerMonth: number
  subscriptionCINominal?: number
  subscriptionCIDuration: number
  subscriptionCISupportMin?: number
  subscriptionCISupportMax?: number
  
  // Fréquence de paiement souhaitée
  paymentFrequency: CaisseImprevuePaymentFrequency
  
  // Date souhaitée pour le début du contrat
  desiredStartDate: string // Format: YYYY-MM-DD
  firstPaymentDate?: string
  
  // Contact d'urgence (obligatoire)
  emergencyContact: EmergencyContactCI
  
  // Statut de la demande
  status: CaisseImprevueDemandStatus
  
  // Raison de décision (acceptation/refus)
  decisionReason?: string // Min 10 caractères
  decisionMadeBy?: string // ID admin (compatibilité V1)
  decisionDate?: Date // Date décision (compatibilité V1)
  
  // Priorité pour tri (1=PENDING, 2=APPROVED, 3=REJECTED, 4=CONVERTED, 5=REOPENED)
  priority: number
  
  // Lien vers le contrat créé (si convertie)
  contractId?: string
  convertedDate?: Date
  
  // Raison de réouverture (si réouverte après refus)
  reopenReason?: string // Min 10 caractères
  
  // Traçabilité complète V2
  createdBy: string // ID admin qui a créé
  createdAt: Date
  updatedBy?: string // ID admin qui a modifié
  updatedAt?: Date
  acceptedBy?: string // ID admin qui a accepté
  acceptedAt?: Date // Date d'acceptation
  rejectedBy?: string // ID admin qui a refusé
  rejectedAt?: Date // Date de refus
  reopenedBy?: string // ID admin qui a réouvert
  reopenedAt?: Date // Date de réouverture
  deletedBy?: string // ID admin qui a supprimé (avant suppression)
  deletedAt?: Date // Date de suppression (avant suppression)
  convertedBy?: string // ID admin qui a créé le contrat
  convertedAt?: Date // Date de conversion en contrat
}

/**
 * Type pour la création d'une demande (sans ID et dates)
 */
export type CreateCaisseImprevueDemandInput = Omit<
  CaisseImprevueDemand,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'acceptedAt'
  | 'rejectedAt'
  | 'reopenedAt'
  | 'deletedAt'
  | 'convertedAt'
  | 'decisionDate'
  | 'convertedDate'
  | 'priority'
  | 'status'
>

/**
 * Type pour la mise à jour d'une demande
 */
export type UpdateCaisseImprevueDemandInput = Partial<
  Pick<
    CaisseImprevueDemand,
    | 'cause'
    | 'subscriptionCIID'
    | 'subscriptionCICode'
    | 'subscriptionCIAmountPerMonth'
    | 'subscriptionCIDuration'
    | 'paymentFrequency'
    | 'desiredStartDate'
    | 'emergencyContact'
  >
>

/**
 * Type pour l'acceptation d'une demande
 */
export interface AcceptDemandInput {
  reason: string // Min 10 caractères
}

/**
 * Type pour le refus d'une demande
 */
export interface RejectDemandInput {
  reason: string // Min 10 caractères
}

/**
 * Type pour la réouverture d'une demande
 */
export interface ReopenDemandInput {
  reason?: string
}

/**
 * Type pour la conversion d'une demande en contrat
 */
export interface ConvertDemandInput {
  contractId?: string // ID du contrat créé
}
