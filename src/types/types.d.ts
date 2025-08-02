import { RegisterFormData } from './schemas'

// ================== TYPES CENTRALISÉS ==================

/**
 * Type principal pour une demande d'adhésion
 * Basé sur le RegisterFormData du schemas.ts avec des champs additionnels pour la gestion
 */
export interface MembershipRequest extends RegisterFormData {
  // Identifiant unique de la demande
  id: string
  
  // Statut de la demande
  status: 'En attente' | 'Approuvée' | 'Rejetée' | 'En cours de traitement'
  
  // Dates de gestion
  createdAt: Date
  updatedAt: Date
  
  // Date de traitement (quand la demande a été approuvée/rejetée)
  processedAt?: Date
  
  // Administrateur qui a traité la demande
  processedBy?: string
  
  // Commentaires administratifs
  adminComments?: string
  
  // Numéro de membre attribué (si approuvé)
  memberNumber?: string
  
  // Score de priorité (pour le tri)
  priorityScore?: number
}

/**
 * Type pour la liste des demandes avec pagination
 */
export interface MembershipRequestsList {
  requests: MembershipRequest[]
  total: number
  page: number
  limit: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/**
 * Type pour les filtres de recherche des demandes
 */
export interface MembershipRequestFilters {
  status?: MembershipRequest['status'][]
  dateFrom?: Date
  dateTo?: Date
  nationality?: string
  hasCar?: boolean
  searchQuery?: string // Recherche dans nom, prénom, email
}

/**
 * Type pour les statistiques des demandes
 */
export interface MembershipRequestStats {
  total: number
  pending: number
  approved: number
  rejected: number
  inProgress: number
  todayCount: number
  weekCount: number
  monthCount: number
}

/**
 * Type pour l'action sur une demande
 */
export interface MembershipRequestAction {
  requestId: string
  action: 'approve' | 'reject' | 'request_more_info'
  adminId: string
  comments?: string
  memberNumber?: string // Pour l'approbation
}

/**
 * Type pour les notifications liées aux demandes
 */
export interface MembershipNotification {
  id: string
  requestId: string
  type: 'new_request' | 'status_update' | 'reminder'
  title: string
  message: string
  isRead: boolean
  createdAt: Date
}

// ================== TYPES POUR L'ASSURANCE ==================

/**
 * Type pour une police d'assurance automobile
 */
export interface InsurancePolicy {
  id: string
  
  // Informations du titulaire
  policyholder: {
    firstName: string
    lastName: string
    email?: string
    phone: string
    memberNumber?: string // Si c'est un membre KARA
  }
  
  // Informations de la police
  policyNumber: string
  status: 'Active' | 'Expirée' | 'Suspendue' | 'En attente' | 'Annulée'
  
  // Informations du véhicule
  vehicle: {
    make: string // Marque (Peugeot, Citroën, etc.)
    model: string // Modèle (308, C3, etc.)
    year: number
    plateNumber?: string
    vinNumber?: string
    engineNumber?: string
  }
  
  // Informations financières
  premium: {
    amount: number
    currency: string
    frequency: 'monthly' | 'quarterly' | 'yearly'
    displayText: string // "€245/mois"
  }
  
  // Dates importantes
  startDate: Date
  expiryDate: Date
  lastPaymentDate?: Date
  nextPaymentDate?: Date
  
  // Couverture
  coverage: {
    type: 'third_party' | 'comprehensive' | 'collision'
    description: string
    deductible?: number
  }
  
  // Historique
  createdAt: Date
  updatedAt: Date
  createdBy: string // ID de l'administrateur
}

/**
 * Type pour les statistiques d'assurance
 */
export interface InsuranceStats {
  totalPolicies: number
  activePolicies: number
  expiredPolicies: number
  pendingPolicies: number
  suspendedPolicies: number
  totalPremiumsMonthly: number
  expiringThisMonth: number
  expiringNextMonth: number
}

/**
 * Type pour les filtres d'assurance
 */
export interface InsurancePolicyFilters {
  status?: InsurancePolicy['status'][]
  vehicleMake?: string[]
  expiryDateFrom?: Date
  expiryDateTo?: Date
  premiumMin?: number
  premiumMax?: number
  searchQuery?: string // Recherche dans nom, prénom, numéro de police
}

// ================== TYPES POUR LE DASHBOARD ==================

/**
 * Type pour les statistiques générales du dashboard
 */
export interface DashboardStats {
  members: {
    total: number
    active: number
    newThisMonth: number
    changePercentage: number
  }
  
  membershipRequests: {
    pending: number
    newToday: number
    changePercentage: number
  }
  
  insurance: {
    activePolicies: number
    newThisMonth: number
    changePercentage: number
    totalPremiumsMonthly: number
  }
  
  content: {
    publishedArticles: number
    newThisYear: number
    changePercentage: number
  }
}

/**
 * Type pour les éléments récents du dashboard
 */
export interface DashboardRecentItems {
  membershipRequests: MembershipRequest[]
  insurancePolicies: InsurancePolicy[]
  activities: DashboardActivity[]
}

/**
 * Type pour les activités du dashboard
 */
export interface DashboardActivity {
  id: string
  type: 'membership_approved' | 'membership_rejected' | 'insurance_created' | 'insurance_expired' | 'article_published'
  title: string
  description: string
  timestamp: Date
  userId?: string
  relatedId?: string // ID de la demande, police, etc.
}

// ================== EXPORTS ==================
export type {
  // Schémas existants réexportés pour centralisation
  RegisterFormData,
  IdentityFormData,
  AddressFormData,
  CompanyFormData,
  DocumentsFormData,
  Civility,
  Gender,
  IdentityDocument,
  MaritalStatus,
  InsuranceType
} from './schemas'