// ================== TYPES CENTRALISÉS ==================

import { EmergencyContact } from '@/schemas/emergency-contact.schema'

export interface INavigation {
  push(path: string): void;
  replace(path: string): void;
  back(): void;
  forward(): void;
  refresh(): void;
  getSearchParam(key: string): string | null;
  getPathname(): string;
}

// Type pour les données du formulaire d'inscription
export interface RegisterFormData {
  identity: {
    civility: string;
    lastName: string;
    firstName?: string; // Optionnel selon le schéma Zod
    birthDate: string;
    birthPlace: string;
    birthCertificateNumber: string;
    prayerPlace: string;
    religion: string;
    contacts: string[];
    email?: string;
    gender: string;
    nationality: string;
    maritalStatus: string;
    spouseLastName?: string;
    spouseFirstName?: string;
    spousePhone?: string;
    intermediaryCode?: string;
    hasCar: boolean;
    photo?: string | File;
    // Champs ajoutés après upload (pour MembershipRequest)
    photoURL?: string | null;
    photoPath?: string | null;
  };
  address: {
    // IDs pour la persistence lors de la navigation entre étapes
    provinceId?: string;
    communeId?: string;
    districtId?: string;
    quarterId?: string;
    // Noms pour l'affichage et la validation
    province: string;
    city: string;
    district: string;
    arrondissement: string;
    additionalInfo?: string;
  };
  company: {
    isEmployed: boolean;
    companyName?: string;
    companyAddress?: {
      province?: string;
      city?: string;
      district?: string;
    };
    profession?: string;
    seniority?: string;
  };
  documents: {
    identityDocument: string;
    customDocumentType?: string;
    identityDocumentNumber: string;
    documentPhotoFront?: string | File;
    documentPhotoBack?: string | File;
    expirationDate: string;
    issuingPlace: string;
    issuingDate: string;
    termsAccepted: boolean;
    // Champs ajoutés après upload (pour MembershipRequest)
    documentPhotoFrontURL?: string | null;
    documentPhotoFrontPath?: string | null;
    documentPhotoBackURL?: string | null;
    documentPhotoBackPath?: string | null;
  };
}

/**
 * Statuts possibles pour une demande d'adhésion
 */
export type MembershipRequestStatus = 'pending' | 'approved' | 'rejected' | 'under_review'

/**
 * Statuts étendus incluant les demandes supprimées
 */
export type ExtendedMembershipRequestStatus = MembershipRequestStatus | 'deleted'

/**
 * Type principal pour une demande d'adhésion
 * Basé sur le RegisterFormData du schemas.ts avec des champs additionnels pour la gestion
 */
export interface MembershipRequest extends RegisterFormData {
  // Identifiant unique de la demande
  id: string

  // Matricule unique de la demande
  matricule: string

  // Statut de la demande
  status: MembershipRequestStatus

  // Dates de gestion
  createdAt: Date
  updatedAt: Date

  // Date de traitement (quand la demande a été approuvée/rejetée)
  processedAt?: Date

  // Administrateur qui a traité la demande
  processedBy?: string
  // Dernier admin ayant mis à jour le dossier (ex: réouverture)
  updatedBy?: string

  // Traçabilité spécifique pour l'approbation
  approvedBy?: string  // ID de l'admin qui a approuvé la demande
  approvedAt?: Date    // Date d'approbation (timestamp serveur)
  adhesionPdfURL?: string  // URL du PDF uploadé lors de l'approbation

  // Commentaires administratifs
  adminComments?: string

  // Numéro de membre attribué (si approuvé)
  memberNumber?: string
  reviewNote?: string;
  // Motif de rejet (raison fournie par l'admin)
  motifReject?: string;
  // Traçabilité de la réouverture (si rejetée puis réouverte)
  reopenedAt?: Date; // Date de la réouverture
  reopenedBy?: string; // ID de l'admin qui a réouvert
  reopenReason?: string; // Motif de la réouverture
  // Paiements
  isPaid?: boolean
  payments?: Payment[]
  // Code de sécurité pour accéder aux corrections
  securityCode?: string;
  // Date d'expiration du code de sécurité
  securityCodeExpiry?: Date;
  // Indique si le code de sécurité a été utilisé (pour éviter la réutilisation)
  securityCodeUsed?: boolean;
  // Score de priorité (pour le tri)
  priorityScore?: number

  // Doublons (détection automatique)
  normalizedEmail?: string | null
  normalizedIdentityDocNumber?: string | null
  isDuplicate?: boolean
  duplicateGroupIds?: string[]
}

export type PaymentMode = 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer' | 'other'
export interface Payment {
  date: Date // Date de versement (quand le client a payé)
  time: string // Heure de versement (HH:mm)
  mode: PaymentMode
  amount: number
  acceptedBy: string // ID de l'admin qui a enregistré
  paymentType: TypePayment
  withFees?: boolean
  paymentMethodOther?: string // Si mode = 'other'
  proofUrl?: string // URL de la preuve de paiement
  proofPath?: string // Chemin Firebase Storage de la preuve
  proofJustification?: string // Justification si pas de preuve
  recordedBy: string // ID de l'admin qui a enregistré le paiement
  recordedByName: string // Nom complet de l'admin (prénom + nom)
  recordedAt: Date // Date d'enregistrement (quand l'admin a enregistré)
}

export type TypePayment = 'Membership' | 'Subscription' | 'Tontine' | 'Charity'

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
 * Interface pour les résultats paginés avec curseurs Firestore
 */
export interface PaginatedMembershipRequests {
  data: MembershipRequest[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
    nextCursor: any // Firestore DocumentSnapshot
    prevCursor: any // Firestore DocumentSnapshot
  }
}

/**
 * Type pour les filtres de recherche des demandes
 */
export interface MembershipRequestFilters {
  status?: MembershipRequestStatus | 'all'
  dateFrom?: Date
  dateTo?: Date
  nationality?: string
  hasCar?: boolean
  searchQuery?: string // Recherche dans nom, prénom, email
  page?: number
  limit?: number
  orderByField?: string
  orderByDirection?: 'asc' | 'desc'
}

/**
 * Type pour les statistiques des demandes
 */
export interface MembershipRequestStats {
  total: number
  pending: number
  approved: number
  rejected: number
  under_review: number
  deleted: number
  todayCount: number
  weekCount: number
  monthCount: number
}

/**
 * Type pour l'action sur une demande
 */
export interface MembershipRequestAction {
  requestId: string
  action: 'approve' | 'reject' | 'under_review' | 'delete'
  adminId: string
  comments?: string
  memberNumber?: string // Pour l'approbation
}

// ================== TYPES POUR LES NOTIFICATIONS ==================

/**
 * Module d'origine de la notification
 */
export type NotificationModule = 'memberships' | 'vehicule' | 'caisse_speciale' | 'caisse_imprevue' | 'bienfaiteur' | 'placement' | 'credit_speciale'

/**
 * Type de notification
 */
export type NotificationType =
  | 'birthday_reminder' // Anniversaire (J-2, J, J+1)
  | 'new_request' // Nouvelle demande d'adhésion
  | 'status_update' // Changement de statut
  | 'reminder' // Rappel générique
  | 'contract_expiring' // Contrat qui expire
  | 'payment_due' // Paiement dû
  | 'contract_created' // Contrat créé
  | 'contract_finished' // Contrat terminé
  | 'contract_canceled' // Contrat résilié
  | 'commission_due_reminder' // Rappel avant échéance de commission (module placement)
  | 'commission_overdue' // Commission en retard (module placement)
  | 'placement_activated' // Placement activé (module placement)
  | 'early_exit_request' // Demande de retrait anticipé (module placement)
  | 'placement_completed' // Placement terminé (module placement)
  | 'demand_created' // Nouvelle demande créée (Caisse Spéciale)
  | 'demand_approved' // Demande acceptée (Caisse Spéciale)
  | 'demand_rejected' // Demande refusée (Caisse Spéciale)
  | 'demand_converted' // Demande convertie en contrat (Caisse Spéciale)
  | 'demand_pending_reminder' // Rappel demande en attente (Caisse Spéciale)
  | 'demand_approved_not_converted' // Rappel demande acceptée non convertie (Caisse Spéciale)
  | 'placement_demand_created' // Nouvelle demande de placement créée
  | 'placement_demand_approved' // Demande de placement acceptée
  | 'placement_demand_rejected' // Demande de placement refusée
  | 'placement_demand_reopened' // Demande de placement réouverte
  | 'placement_demand_converted' // Demande de placement convertie en placement
  | 'placement_demand_pending_reminder' // Rappel demande de placement en attente
  | 'placement_demand_approved_not_converted' // Rappel demande de placement acceptée non convertie
  | 'caisse_imprevue_demand_created' // Nouvelle demande Caisse Imprévue créée
  | 'caisse_imprevue_demand_approved' // Demande Caisse Imprévue acceptée
  | 'caisse_imprevue_demand_rejected' // Demande Caisse Imprévue refusée
  | 'caisse_imprevue_demand_reopened' // Demande Caisse Imprévue réouverte
  | 'caisse_imprevue_demand_converted' // Demande Caisse Imprévue convertie en contrat
  | 'caisse_imprevue_demand_pending_reminder' // Rappel demande Caisse Imprévue en attente
  | 'caisse_imprevue_demand_approved_not_converted' // Rappel demande Caisse Imprévue acceptée non convertie
  | 'corrections_requested' // Corrections demandées (Membership Requests)
  | 'corrections_submitted' // Corrections soumises (Membership Requests)
  | 'security_code_expired' // Code de sécurité expiré (Membership Requests)
  | 'security_code_expiring_soon' // Code de sécurité bientôt expiré (Membership Requests)
  | 'security_code_renewed' // Code de sécurité régénéré (Membership Requests)
  | 'membership_approved' // Demande d'adhésion approuvée (Membership Requests)
  | 'membership_rejected' // Demande d'adhésion rejetée (Membership Requests)
  | 'membership_reopened' // Dossier rejeté réouvert (Membership Requests)
  | 'membership_deleted' // Dossier rejeté supprimé définitivement (Membership Requests)

/**
 * Filtres pour les requêtes de notifications
 */
export interface NotificationFilters {
  module?: NotificationModule
  type?: NotificationType
  isRead?: boolean
  dateFrom?: Date
  dateTo?: Date
}

/**
 * Résultat paginé des notifications
 */
export interface PaginatedNotifications {
  data: Notification[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

/**
 * Type unifié pour les notifications
 */
export interface Notification {
  id: string
  module: NotificationModule
  entityId: string // ID de la ressource (memberId, requestId, etc.)
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  createdAt: Date
  scheduledAt?: Date
  sentAt?: Date
  metadata?: {
    // Métadonnées communes
    [key: string]: any
    
    // Métadonnées spécifiques aux anniversaires (si type === 'birthday_reminder')
    memberId?: string
    memberFirstName?: string
    memberLastName?: string
    birthDate?: string // ISO string
    daysUntil?: number // -1, 0, ou 2
    age?: number
    notificationDate?: string // YYYY-MM-DD pour éviter les doublons
  }
  
  // Champs spécifiques selon le module (optionnels, pour compatibilité)
  requestId?: string
  memberId?: string
  contractId?: string
}

/**
 * Type pour les notifications liées aux demandes (ancien format, à migrer progressivement)
 * @deprecated Utiliser Notification à la place
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

// ================== TYPES POUR LES UTILISATEURS ==================

/**
 * Types de membres possibles
 */
export type MembershipType = 'adherant' | 'bienfaiteur' | 'sympathisant'

/**
 * Types de rôles possibles pour un utilisateur
 */
export type UserRole = 'Adherant' | 'Bienfaiteur' | 'Sympathisant' | 'Admin' | 'SuperAdmin' | 'Secretary'

/**
 * Type pour un utilisateur dans la collection users
 */
export interface User {
  // Identifiant unique (même que l'UID Firebase et matricule)
  id: string

  // Matricule au format nombreUser.MK.dateCréation (ex: 0004.MK.040825)
  matricule: string

  // Informations personnelles (tirées de RegisterFormData.identity)
  lastName: string
  firstName: string
  birthDate: string
  birthPlace?: string
  contacts: string[]
  gender: string
  email?: string
  nationality: string
  hasCar: boolean

  // Adresse (tirée de RegisterFormData.address)
  address?: {
    province: string
    city: string
    district: string
    arrondissement: string
    additionalInfo?: string
  }

  // Informations professionnelles (tirées de RegisterFormData.company)
  companyName?: string
  profession?: string

  // Photos
  photoURL?: string | null
  photoPath?: string | null

  // Documents
  identityDocument?: string
  identityDocumentNumber?: string

  // Références
  subscriptions: string[] // Liste d'IDs de subscriptions
  dossier: string // Référence vers la demande membership-request

  // Type de membre (maintenu pour compatibilité)
  membershipType: MembershipType

  // Rôles de l'utilisateur (peut avoir plusieurs rôles)
  roles: UserRole[]

  // Métadonnées
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  // Groupes d'appartenance (peut appartenir à plusieurs groupes)
  groupIds?: string[]
  // Caisse Spéciale
  caisseContractIds?: string[]
}

// ================== TYPES CAISSE IMPREVUE ==================

export type CaisseImprevuePaymentFrequency = 'DAILY' | 'MONTHLY'
export type ContractCIStatus = 'ACTIVE' | 'FINISHED' | 'CANCELED'
export type PaymentCIStatus = 'DUE' | 'PAID' | 'PARTIAL'

/**
 * Type pour le contact d'urgence d'un contrat CI
 */
export interface EmergencyContactCI {
  memberId?: string // ID du membre si le contact d'urgence est un membre
  lastName: string
  firstName?: string
  phone1: string
  phone2?: string
  relationship: string
  idNumber: string // Numéro CNI/PASS/CS (obligatoire)
  typeId: string // Type de document (CNI, PASS, Carte Étudiant, Carte Étranger, Carte Consulaire) (obligatoire)
  documentPhotoUrl: string // URL de la photo du document (obligatoire)
}

/**
 * Type pour un versement individuel
 */
export interface VersementCI {
  id: string // Ex: "v_20250119_1430"
  date: string // Format: "2025-01-19"
  time: string // Format: "14:30"
  amount: number // Montant du versement
  mode: PaymentMode // airtel_money | mobicash | cash | bank_transfer
  
  // Preuves
  proofUrl: string // URL Firebase Storage
  proofPath: string // Chemin Firebase Storage
  
  // Métadonnées
  createdAt: Date
  createdBy: string
  
  // Optionnel : Agent de recouvrement ayant collecté le versement
  agentRecouvrementId?: string
  
  // Optionnel : Pénalités (si versement en retard)
  penalty?: number
  daysLate?: number
  
  // Remboursement de support (si applicable)
  supportRepaymentAmount?: number // Montant déduit pour rembourser le support
  supportRepaymentId?: string // ID du remboursement de support lié
}

/**
 * Type pour un paiement mensuel (document dans la sous-collection payments)
 */
export interface PaymentCI {
  id: string // Ex: "month-0", "month-1", etc.
  contractId: string
  monthIndex: number // 0, 1, 2, ..., 11
  status: PaymentCIStatus // 'DUE' | 'PAID' | 'PARTIAL'
  
  // Objectifs et cumuls
  targetAmount: number // Montant objectif du mois
  accumulatedAmount: number // Total versé ce mois
  
  // Versements du mois
  versements: VersementCI[]
  
  // Remboursement de support
  supportRepaymentAmount?: number // Montant total déduit pour rembourser le support dans ce mois
  
  // Métadonnées
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
}

/**
 * Statut d'un support
 */
export type SupportCIStatus = 'ACTIVE' | 'REPAID'

/**
 * Type pour un remboursement de support
 */
export interface SupportRepaymentCI {
  id: string // ID unique du remboursement
  amount: number // Montant remboursé
  date: string // Date du remboursement (format: "2025-01-19")
  time: string // Heure du remboursement (format: "14:30")
  monthIndex: number // Mois dans lequel le remboursement a été fait
  versementId: string // ID du versement lié (pour traçabilité)
  createdAt: Date
  createdBy: string
}

/**
 * Type pour un support/aide financière
 * Stocké dans Firestore dans la sous-collection 'supports' de 'contractsCI'
 */
export interface SupportCI {
  id: string // ID unique du support
  contractId: string // Référence au contrat
  
  // Montant et statut
  amount: number // Montant du support accordé
  status: SupportCIStatus // Statut du remboursement
  
  // Document de demande signé
  documentId?: string // ID du document dans la collection 'documents'
  documentUrl?: string // URL du document dans Firebase Storage
  documentPath?: string // Chemin du document dans Firebase Storage
  
  // Remboursement
  amountRepaid: number // Montant déjà remboursé
  amountRemaining: number // Montant restant à rembourser
  
  // Déduction des 3 derniers mois
  deductions: {
    monthIndex: number
    amount: number
  }[] // Déductions appliquées aux 3 derniers mois
  
  // Historique des remboursements
  repayments: SupportRepaymentCI[]
  
  // Métadonnées
  requestedAt: Date // Date de la demande
  approvedAt: Date // Date d'approbation
  approvedBy: string // ID de l'admin qui a approuvé
  repaidAt?: Date // Date de remboursement complet
  
  createdAt: Date
  createdBy: string
  updatedAt: Date
  updatedBy: string
}

/**
 * Type pour un contrat de Caisse Imprévue
 * Stocké dans Firestore dans la collection 'contractsCI'
 */
export interface ContractCI {
  // Identifiant unique
  id: string

  // Informations du membre (Step 1)
  memberId: string
  memberFirstName: string
  memberLastName: string
  memberContacts: string[]
  memberEmail?: string
  memberGender?: string
  memberBirthDate?: string
  memberNationality?: string
  memberAddress?: string
  memberProfession?: string
  memberPhotoUrl?: string

  // Informations du forfait (Step 2)
  subscriptionCIID: string
  subscriptionCICode: string
  subscriptionCILabel?: string
  subscriptionCIAmountPerMonth: number
  subscriptionCINominal: number
  subscriptionCIDuration: number
  subscriptionCISupportMin: number
  subscriptionCISupportMax: number
  paymentFrequency: CaisseImprevuePaymentFrequency
  firstPaymentDate: string

  // Contact d'urgence (Step 3)
  emergencyContact: EmergencyContactCI

  // Statut du contrat
  status: ContractCIStatus

  // Documents du contrat
  contractStartId?: string
  contractCanceledId?: string
  contractFinishedId?: string

  // Retrait anticipé
  earlyRefundDocumentId?: string // ID du document PDF de retrait anticipé dans la collection 'documents'

  // Remboursement final
  finalRefundDocumentId?: string // ID du document PDF de remboursement final dans la collection 'documents'

  // Support/Aide
  currentSupportId?: string // ID du support actif (null si aucun ou remboursé)
  supportHistory: string[] // Liste des IDs de tous les supports (historique)
  totalMonthsPaid: number // Nombre de mois complètement payés
  isEligibleForSupport: boolean // Calculé : totalMonthsPaid >= 3 && !currentSupportId

  // Métadonnées
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
}

/**
 * Statut d'un retrait anticipé CI
 */
export type EarlyRefundCIStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'ARCHIVED'

/**
 * Statut d'un remboursement final CI (même structure que EarlyRefundCIStatus)
 */
export type FinalRefundCIStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'ARCHIVED'

/**
 * Type pour une demande de retrait anticipé CI
 * Stocké dans Firestore dans la sous-collection 'earlyRefunds' de 'contractsCI'
 */
export interface EarlyRefundCI {
  // Identifiant unique
  id: string

  // Référence au contrat
  contractId: string

  // Type de remboursement (toujours 'EARLY' pour ce type)
  type: 'EARLY'

  // Informations du retrait
  reason: string // Motif du retrait
  withdrawalDate: Date // Date du retrait
  withdrawalTime: string // Heure du retrait (HH:mm)
  withdrawalAmount: number // Montant retiré
  withdrawalMode: 'cash' | 'bank_transfer' | 'airtel_money' | 'mobicash' // Mode de retrait

  // Preuve du retrait
  proofUrl: string // URL Firebase Storage
  proofPath: string // Chemin Firebase Storage

  // Document PDF signé
  documentId: string // ID du document dans la collection 'documents'

  // Montants calculés
  amountNominal: number // Montant nominal (somme des versements)
  amountBonus: number // Montant bonus (si applicable)

  // Statut
  status: EarlyRefundCIStatus

  // Échéance (45 jours après création)
  deadlineAt: Date

  // Métadonnées
  createdAt: Date
  updatedAt: Date
  createdBy: string // ID de l'admin qui a créé
  updatedBy: string // ID de l'admin qui a mis à jour

  // Approbation (optionnel)
  approvedBy?: string // ID de l'admin qui a approuvé
  approvedAt?: Date // Date d'approbation

  // Paiement (optionnel)
  paidAt?: Date // Date de paiement
}

/**
 * Type pour une demande de remboursement final CI
 * Stocké dans Firestore dans la sous-collection 'earlyRefunds' de 'contractsCI'
 * (réutilise la même sous-collection mais avec type: 'FINAL')
 */
export interface FinalRefundCI {
  // Identifiant unique
  id: string

  // Référence au contrat
  contractId: string

  // Type de remboursement (toujours 'FINAL' pour ce type)
  type: 'FINAL'

  // Informations du retrait
  reason: string // Motif du retrait
  withdrawalDate: Date // Date du retrait
  withdrawalTime: string // Heure du retrait (HH:mm)
  withdrawalAmount: number // Montant retiré (égal au montant total versé)
  withdrawalMode: 'cash' | 'bank_transfer' | 'airtel_money' | 'mobicash' // Mode de retrait

  // Preuve du retrait
  proofUrl: string // URL Firebase Storage
  proofPath: string // Chemin Firebase Storage

  // Document PDF signé
  documentId: string // ID du document dans la collection 'documents'

  // Montants calculés
  amountNominal: number // Montant nominal (somme des versements)
  amountBonus: number // Montant bonus (si applicable)

  // Statut
  status: FinalRefundCIStatus

  // Échéance (45 jours après création)
  deadlineAt: Date

  // Métadonnées
  createdAt: Date
  updatedAt: Date
  createdBy: string // ID de l'admin qui a créé
  updatedBy: string // ID de l'admin qui a mis à jour

  // Approbation (optionnel)
  approvedBy?: string // ID de l'admin qui a approuvé
  approvedAt?: Date // Date d'approbation

  // Paiement (optionnel)
  paidAt?: Date // Date de paiement
}

/**
 * Type pour un contrat de Caisse Imprévue (souscription)
 * Stocké dans Firestore dans la collection 'caisse-imprevue-contracts'
 */
export interface SubscriptionCI {
  // Identifiant unique du forfait
  id: string

  // label du forfait
  label?: string

  // Code du forfait sélectionné (A à E)
  code: string

  // Montant mensuel à cotiser (en FCFA)
  amountPerMonth: number

  // Somme nominale à atteindre en 12 mois (en FCFA)
  nominal: number

  // Durée du forfait en mois (généralement 12)
  durationInMonths: number

  // Taux de pénalité en pourcentage (ex: 0.5 pour 0.5%)
  penaltyRate: number

  // Nombre de jours de délai avant application des pénalités (ex: 3 jours)
  penaltyDelayDays: number

  // Montant minimum d'appui/aide possible (en FCFA)
  supportMin: number

  // Montant maximum d'appui/aide possible (en FCFA)
  supportMax: number

  // Statut du forfait
  status: 'ACTIVE' | 'INACTIVE'

  // Métadonnées
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

// ================== TYPES POUR LES GROUPES ==================

export interface Group {
  id: string
  name: string
  label?: string
  description?: string
  // Un groupe peut être contraint à un seul membre, mais on stocke côté user
  // Audit
  createdAt: Date
  createdBy: string
  updatedAt: Date
  updatedBy?: string
}

export interface GroupFilters {
  searchQuery?: string
  createdBy?: string
  label?: string
}

/**
 * Type pour une souscription dans la collection subscriptions
 */
export interface Subscription {
  // Identifiant unique
  id: string

  // Référence vers l'utilisateur
  userId: string

  // Dates de validité
  dateStart: Date
  dateEnd: Date

  // Montant
  montant: number
  currency: string // 'EUR', 'XOF', etc.

  // Type de souscription
  type: MembershipType

  // Statut (peut être calculé ou stocké)
  isValid?: boolean

  // Métadonnées
  createdAt: Date
  updatedAt: Date
  createdBy: string // ID de l'administrateur qui a créé
  // Lien vers la fiche d'adhésion PDF (renouvellement)
  adhesionPdfURL?: string
}

/**
 * Type pour les statistiques des utilisateurs
 */
export interface UserStats {
  total: number
  active: number
  inactive: number
  byMembershipType: {
    adherant: number
    bienfaiteur: number
    sympathisant: number
  }
  withCar: number
  withoutCar: number
  newThisMonth: number
  newThisYear: number
}

/**
 * Type pour les filtres des utilisateurs
 */
export interface UserFilters {
  membershipType?: MembershipType[]
  roles?: UserRole[]
  nationality?: string[]
  hasCar?: boolean
  isActive?: boolean
  searchQuery?: string // Recherche dans nom, prénom, email, matricule

  // Filtres par adresse
  province?: string
  city?: string
  arrondissement?: string
  district?: string

  // Filtres professionnels
  companyName?: string
  profession?: string

  page?: number
  limit?: number
  orderByField?: string
  orderByDirection?: 'asc' | 'desc'
}

// ================== TYPES POUR LES ENTREPRISES ET PROFESSIONS ==================

/**
 * Type pour une entreprise dans la collection companies
 */
export interface CompanyAddress {
  province?: string
  city?: string
  district?: string
}

export interface Company {
  id: string
  name: string
  normalizedName: string // Nom normalisé pour la recherche
  address?: CompanyAddress & {
    arrondissement?: string
    additionalInfo?: string
  }
  industry?: string
  employeeCount?: number
  createdAt: Date
  updatedAt: Date
  createdBy: string // ID de l'administrateur qui a créé
}

/**
 * Type pour une profession dans la collection professions
 */
export interface Profession {
  id: string
  name: string
  normalizedName: string // Nom normalisé pour la recherche
  category?: string
  description?: string
  createdAt: Date
  updatedAt: Date
  createdBy: string // ID de l'administrateur qui a créé
}

/**
 * Type pour la recherche d'entreprise
 */
export interface CompanySearchResult {
  found: boolean
  company?: Company
  suggestions?: string[] // Suggestions si pas trouvé
}

/**
 * Type pour la recherche de profession
 */
export interface ProfessionSearchResult {
  found: boolean
  profession?: Profession
  suggestions?: string[] // Suggestions si pas trouvé
}

// ================== TYPES POUR LA CRÉATION DE CONTRATS ==================

/**
 * Type pour le formulaire de création de contrat
 */
export interface ContractFormData {
  // Étape 1: Sélection du type de contrat
  contractType: 'INDIVIDUAL' | 'GROUP'
  memberId?: string
  groupeId?: string

  // Étape 2: Configuration de la caisse
  caisseType:
    | 'STANDARD'
    | 'JOURNALIERE'
    | 'LIBRE'
    | 'STANDARD_CHARITABLE'
    | 'JOURNALIERE_CHARITABLE'
    | 'LIBRE_CHARITABLE'
  monthlyAmount: number
  monthsPlanned: number

  // Étape 3: Planification des versements
  firstPaymentDate: string

  // Étape 3: Document PDF du contrat signé
  contractPdf?: File

  // Étape 3: Contact d'urgence
  emergencyContact?: EmergencyContact

  // Métadonnées
  isValid: boolean
  currentStep: number
}

/**
 * Type pour les résultats de recherche d'entités (membres/groupes)
 */
export interface EntitySearchResult {
  id: string
  displayName: string
  type: 'member' | 'group'
  additionalInfo: string // matricule, nom du groupe, etc.
  photoURL?: string
  contacts?: string[]
}

/**
 * Type pour les filtres de recherche d'entités
 */
export interface EntitySearchFilters {
  type: 'member' | 'group' | 'both'
  searchQuery: string
  limit: number
}

/**
 * Type pour la validation des paramètres de caisse
 */
export interface CaisseValidationResult {
  isValid: boolean
  isLoading: boolean
  error?: string
  settings?: any
}

/**
 * Type pour les étapes du formulaire
 */
export interface ContractFormStep {
  id: number
  title: string
  description: string
  isCompleted: boolean
  isActive: boolean
  isValid: boolean
}

/**
 * Type pour la navigation entre les étapes
 */
export interface ContractFormNavigation {
  currentStep: number
  totalSteps: number
  canGoNext: boolean
  canGoPrev: boolean
  canSubmit: boolean
}

// ================== TYPES POUR LES CONTRATS CAISSE ==================

/**
 * Interface pour les documents PDF des remboursements
 */
export interface RefundDocument {
  id: string
  url: string
  path: string
  uploadedAt: Date
  uploadedBy: string
  originalFileName: string
  fileSize: number
  status: 'active' | 'archived' | 'replaced'
}

/**
 * Interface pour les remboursements avec documents
 */
export interface RefundWithDocument {
  id: string
  type: 'FINAL' | 'EARLY' | 'DEFAULT'
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'ARCHIVED'
  amountNominal: number
  amountBonus: number
  deadlineAt?: Date
  reason?: string
  withdrawalDate?: Date
  withdrawalTime?: string
  document?: RefundDocument
  createdAt: Date
  updatedAt: Date
}

/**
 * Interface pour les contrats de caisse avec documents
 */
export interface CaisseContract {
  id?: string
  memberId: string
  groupeId?: string
  contractType: 'INDIVIDUAL' | 'GROUP'
  caisseType:
    | 'STANDARD'
    | 'JOURNALIERE'
    | 'LIBRE'
    | 'STANDARD_CHARITABLE'
    | 'JOURNALIERE_CHARITABLE'
    | 'LIBRE_CHARITABLE'
  monthlyAmount: number
  monthsPlanned: number
  status: string
  nominalPaid: number
  bonusAccrued: number
  penaltiesTotal: number
  currentMonthIndex: number
  withdrawLockedUntilM: number
  contractStartAt?: Date
  contractEndAt?: Date
  nextDueAt?: Date
  payments: any[]
  refunds: RefundWithDocument[]
  contractPdf?: {
    url: string
    path: string
    uploadedAt: Date
    originalFileName: string
    fileSize: number
  }
  searchableText?: string
  searchableTextFirstNameFirst?: string
  searchableTextMatriculeFirst?: string
  emergencyContact?: EmergencyContact
  createdAt: Date
  updatedAt: Date
}

/**
 * Statuts possibles pour une demande de contrat Caisse Spéciale
 */
export type CaisseSpecialeDemandStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED'

/**
 * Interface pour une demande de contrat Caisse Spéciale
 */
export interface CaisseSpecialeDemand {
  id: string // Format: MK_DEMANDE_CS_{matricule}_{date}_{heure}
  
  // Informations du demandeur
  memberId?: string // Pour demande individuelle
  groupeId?: string // Pour demande de groupe
  contractType: 'INDIVIDUAL' | 'GROUP'
  
  // Informations de la demande
  caisseType:
    | 'STANDARD'
    | 'JOURNALIERE'
    | 'LIBRE'
    | 'STANDARD_CHARITABLE'
    | 'JOURNALIERE_CHARITABLE'
    | 'LIBRE_CHARITABLE'
  monthlyAmount: number // Montant mensuel souhaité
  monthsPlanned: number // Durée souhaitée (en mois)
  desiredDate: string // Date souhaitée pour le début du contrat (format: YYYY-MM-DD)
  cause?: string // Raison de la demande (optionnel)
  
  // Statut et décision
  status: CaisseSpecialeDemandStatus
  
  // Traçabilité de l'acceptation (5.1)
  approvedBy?: string
  approvedAt?: Date
  approvedByName?: string
  approveReason?: string
  
  // Traçabilité du refus (5.5)
  rejectedBy?: string
  rejectedAt?: Date
  rejectedByName?: string
  rejectReason?: string
  
  // Traçabilité de la conversion (5.12)
  convertedBy?: string
  convertedAt?: Date
  convertedByName?: string
  
  // Traçabilité générique (rétrocompatibilité)
  decisionMadeAt?: Date
  decisionMadeBy?: string
  decisionMadeByName?: string
  decisionReason?: string
  
  // Traçabilité de la réouverture (5.9)
  reopenedAt?: Date
  reopenedBy?: string
  reopenedByName?: string
  reopenReason?: string
  
  // Lien vers le contrat créé (si convertie)
  contractId?: string // ID du contrat créé depuis cette demande
  
  // Contact d'urgence (C.0 - V2)
  emergencyContact?: EmergencyContact
  
  // Champs de recherche dénormalisés (C.8 - V2)
  searchableText?: string
  searchableTextFirstNameFirst?: string
  searchableTextMatriculeFirst?: string
  
  // Métadonnées
  createdAt: Date
  updatedAt: Date
  createdBy: string // ID de l'agent qui a créé la demande
  updatedBy?: string // ID de l'agent qui a modifié la demande
}

/**
 * Filtres pour la recherche de demandes Caisse Spéciale
 */
export interface CaisseSpecialeDemandFilters {
  status?: CaisseSpecialeDemandStatus | 'all'
  contractType?: 'INDIVIDUAL' | 'GROUP' | 'all'
  caisseType?:
    | 'STANDARD'
    | 'JOURNALIERE'
    | 'LIBRE'
    | 'STANDARD_CHARITABLE'
    | 'JOURNALIERE_CHARITABLE'
    | 'LIBRE_CHARITABLE'
    | 'all'
  memberId?: string
  groupeId?: string
  decisionMadeBy?: string // Filtrer par agent qui a pris la décision
  createdAtFrom?: Date // Filtre par date de création (début)
  createdAtTo?: Date // Filtre par date de création (fin)
  desiredDateFrom?: Date // Filtre par date souhaitée (début)
  desiredDateTo?: Date // Filtre par date souhaitée (fin)
  search?: string // Recherche textuelle (nom, prénom, matricule via searchableText*)
  page?: number
  limit?: number
}

/**
 * Résultat paginé des demandes Caisse Spéciale
 */
export interface CaisseSpecialeDemandsPaginated {
  items: CaisseSpecialeDemand[]
  total: number
}

/**
 * Statistiques des demandes Caisse Spéciale
 */
export interface CaisseSpecialeDemandStats {
  total: number // Total de toutes les demandes
  pending: number // Demandes en attente
  approved: number // Demandes acceptées
  rejected: number // Demandes refusées
  converted: number // Demandes converties en contrats
}

// ================== TYPES POUR LES DOCUMENTS ==================

/**
 * Types de documents possibles
 */
export type DocumentType = 
  | 'ADHESION_CS'      // Contrat d'adhésion Caisse Spéciale
  | 'ADHESION_CI'      // Contrat d'adhésion Caisse Imprévue
  | 'ADHESION'         // Contrat d'adhésion général
  | 'CANCELED_CS'      // Contrat d'annulation Caisse Spéciale
  | 'CANCELED_CI'      // Contrat d'annulation Caisse Imprévue
  | 'FINISHED_CS'      // Contrat de fin Caisse Spéciale
  | 'FINISHED_CI'      // Contrat de fin Caisse Imprévue
  | 'SUPPORT_CI'       // Document de demande de support Caisse Imprévue
  | 'EARLY_REFUND_CI'  // Document de retrait anticipé Caisse Imprévue
  | 'FINAL_REFUND_CI'  // Document de remboursement final Caisse Imprévue
  | 'EARLY_REFUND_CS'  // Document de retrait anticipé Caisse Spéciale
  | 'FINAL_REFUND_CS'  // Document de remboursement final Caisse Spéciale
  | 'CHARITY_EVENT_MEDIA'         // Média d'évènement Bienfaiteur
  | 'CHARITY_CONTRIBUTION_RECEIPT' // Reçu de contribution Bienfaiteur
  | 'CHARITY_EVENT_REPORT'         // Rapport d'évènement Bienfaiteur
  | 'PLACEMENT_CONTRACT'           // Contrat de placement
  | 'PLACEMENT_COMMISSION_PROOF'   // Preuve de commission placement
  | 'PLACEMENT_EARLY_EXIT_QUITTANCE' // Quittance de retrait anticipé placement
  | 'PLACEMENT_FINAL_QUITTANCE'      // Quittance finale placement
  | 'PLACEMENT_EARLY_EXIT_ADDENDUM'   // Avenant retrait anticipé placement
  | 'PLACEMENT_EARLY_EXIT_DOCUMENT'   // Document PDF signé de retrait anticipé
  | 'CREDIT_SPECIALE_CONTRACT'     // Contrat crédit spéciale
  | 'CREDIT_SPECIALE_CONTRACT_SIGNED' // Contrat crédit spéciale signé
  | 'CREDIT_SPECIALE_RECEIPT'      // Reçu de paiement crédit spéciale
  | 'CREDIT_SPECIALE_DISCHARGE'    // Décharge crédit spéciale
  | 'CREDIT_SPECIALE_QUITTANCE'    // Quittance remplie (template + infos contrat)
  | 'CREDIT_SPECIALE_QUITTANCE_SIGNED' // Quittance signée par le membre

/**
 * Formats de documents possibles
 */
export type DocumentFormat = 
  | 'pdf'
  | 'word'
  | 'excel'
  | 'image'
  | 'text'

// ================== TYPES POUR CRÉDIT SPÉCIALE / FIXE / AIDE ==================

/**
 * Types de crédit possibles
 */
export type CreditType = 'SPECIALE' | 'FIXE' | 'AIDE'

/**
 * Statut d'une demande de crédit
 */
export type CreditDemandStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/**
 * Statut d'un contrat de crédit
 */
export type CreditContractStatus = 
  | 'DRAFT'           // Brouillon (demande créée, pas encore validée)
  | 'PENDING'          // En attente de validation
  | 'APPROVED'         // Approuvé, en attente de simulation
  | 'SIMULATED'        // Simulation effectuée, en attente de contrat
  | 'ACTIVE'           // Contrat signé et actif
  | 'OVERDUE'          // En retard de paiement
  | 'PARTIAL'          // Partiellement remboursé
  | 'TRANSFORMED'      // Transformé en crédit fixe après 7 mois
  | 'BLOCKED'          // Bloqué (pénalités impayées)
  | 'DISCHARGED'       // Déchargé (remboursement complet)
  | 'CLOSED'           // Clos
  | 'EXTENDED'         // Étendu (remplacé par une augmentation de crédit)

/**
 * Moyen de paiement pour crédit spéciale
 */
export type CreditPaymentMode = 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CHEQUE'

/**
 * Type pour une demande de crédit
 */
export interface CreditDemand {
  id: string
  clientId: string
  clientFirstName: string
  clientLastName: string
  clientContacts: string[]
  creditType: CreditType
  amount: number
  monthlyPaymentAmount?: number
  desiredDate: string // Date souhaitée pour le crédit
  cause: string
  status: CreditDemandStatus
  guarantorId?: string
  guarantorFirstName?: string
  guarantorLastName?: string
  guarantorRelation?: string
  guarantorIsMember: boolean
  eligibilityOverride?: {
    justification: string
    adminId: string
    adminName: string
    createdAt: Date
  }
  adminComments?: string // Commentaires/motif d'approbation ou de rejet
  score?: number // Score de fiabilité (0-10, admin-only)
  scoreUpdatedAt?: Date
  contractId?: string // Relation 1:1 avec le contrat (une demande = un seul contrat)
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

/**
 * Type pour un contrat de crédit
 */
export interface CreditContract {
  id: string
  demandId: string
  parentContractId?: string // Référence au contrat parent (si augmentation de crédit)
  clientId: string
  clientFirstName: string
  clientLastName: string
  clientContacts: string[]
  creditType: CreditType
  amount: number
  interestRate: number
  monthlyPaymentAmount: number
  totalAmount: number // Montant + intérêts
  duration: number // Durée en mois
  firstPaymentDate: Date
  nextDueAt?: Date
  status: CreditContractStatus
  amountPaid: number
  amountRemaining: number
  guarantorId?: string
  guarantorFirstName?: string
  guarantorLastName?: string
  guarantorRelation?: string
  guarantorIsMember: boolean
  guarantorIsParrain: boolean // Si le garant a parrainé le client
  guarantorRemunerationPercentage: number // % du montant global (capital + intérêts) pour le parrain (0-5%, 2% par défaut, calculé sur max 7 mois)
  emergencyContact?: EmergencyContact // Contact d'urgence
  contractUrl?: string // URL du contrat PDF généré
  signedContractUrl?: string // URL du contrat signé téléversé
  dischargeUrl?: string // URL de la décharge
  dischargeMotif?: string // Motif de la décharge (remboursement final)
  dischargedBy?: string // Admin UID ayant validé la décharge
  signedQuittanceUrl?: string // URL de la quittance signée par le membre
  signedQuittanceDocumentId?: string // ID du document quittance signée
  closedAt?: Date // Date de clôture du contrat
  closedBy?: string // Admin UID ayant clôturé le contrat
  motifCloture?: string // Motif de clôture
  activatedAt?: Date
  fundsReleasedAt?: Date
  dischargedAt?: Date
  transformedAt?: Date
  extendedAt?: Date // Date à laquelle le contrat a été étendu (augmentation)
  blockedAt?: Date
  blockedReason?: string // Peut contenir le motif ou l'ID du nouveau contrat
  score?: number // Score de fiabilité (0-10, admin-only)
  scoreUpdatedAt?: Date
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

/**
 * Type pour une échéance de crédit (installment)
 */
export interface CreditInstallment {
  id: string
  creditId: string
  installmentNumber: number // Numéro de l'échéance (1, 2, 3, ...)
  dueDate: Date // Date d'échéance
  principalAmount: number // Montant du capital pour cette échéance
  interestAmount: number // Montant des intérêts pour cette échéance
  totalAmount: number // Montant total à payer (principal + intérêts)
  paidAmount: number // Montant payé pour cette échéance
  remainingAmount: number // Montant restant à payer
  status: 'PENDING' | 'DUE' | 'PARTIAL' | 'PAID' | 'OVERDUE' // Statut de l'échéance
  paidAt?: Date // Date de paiement complet
  paymentId?: string // ID du paiement qui a complété cette échéance
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

/**
 * Type pour un versement de crédit
 */
export interface CreditPayment {
  id: string
  creditId: string
  installmentId?: string // ID de l'échéance à laquelle ce paiement est lié
  amount: number // Montant total du paiement
  principalAmount: number // Montant du capital payé
  interestAmount: number // Montant des intérêts payés
  penaltyAmount: number // Montant des pénalités payées (si applicable)
  paymentDate: Date
  paymentTime: string
  mode: CreditPaymentMode
  proofUrl?: string
  comment?: string
  note?: number // Note sur 10
  reference?: string // Référence unique du paiement
  receiptUrl?: string // URL du reçu PDF
  agentRecouvrementId?: string // ID de l'agent ayant collecté le paiement
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

/**
 * Type pour une pénalité
 */
export interface CreditPenalty {
  id: string
  creditId: string
  installmentId: string // ID de l'échéance concernée
  amount: number
  daysLate: number
  dueDate: Date // Date d'échéance de l'installment
  paid: boolean
  paidAt?: Date
  paymentId?: string // ID du paiement qui a payé cette pénalité
  reported: boolean // Si le client a choisi de reporter
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

/**
 * Type pour la rémunération du garant
 */
export interface GuarantorRemuneration {
  id: string
  creditId: string
  guarantorId: string
  paymentId: string
  amount: number // 2% du montant versé mensuel
  month: number // Mois concerné
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

/**
 * Type pour une simulation standard
 */
export interface StandardSimulation {
  remainingAtMaxDuration?: number // Solde restant au 7ème mois pour crédit spéciale
  suggestedMonthlyPayment?: number // Mensualité suggérée pour rembourser en 7 mois
  amount: number
  interestRate: number
  monthlyPayment: number
  firstPaymentDate: Date
  duration: number // Calculé
  totalAmount: number // Montant + intérêts
  isValid: boolean // Si respecte les limites (7 mois spéciale, 3 mois aide)
  suggestedMinimumAmount?: number // Si dépasse les limites
}

/**
 * Type pour une simulation personnalisée
 */
export interface CustomSimulation {
  amount: number
  interestRate: number
  monthlyPayments: Array<{
    month: number
    amount: number
  }>
  firstPaymentDate: Date
  duration: number // Calculé
  totalAmount: number // Montant + intérêts
  isValid: boolean
  suggestedMinimumAmount?: number
}

/**
 * Interface pour un document
 */
export interface Document {
  id?: string
  type: DocumentType
  format: DocumentFormat
  libelle: string
  path: string
  url: string
  size: number
  memberId: string
  contractId?: string
  createdBy: string
  updatedBy: string
  createdAt: Date
  updatedAt: Date
}

// ================== TYPES POUR LE MODULE BIENFAITEUR ==================

/**
 * Statuts possibles pour un évènement de charité
 */
export type CharityEventStatus = 'draft' | 'upcoming' | 'ongoing' | 'closed' | 'archived'

/**
 * Type pour un évènement de charité (récollection)
 */
export interface CharityEvent {
  id: string
  title: string
  slug?: string
  description: string
  location: string
  startDate: Date
  endDate: Date
  minContributionAmount?: number
  targetAmount?: number
  currency: string
  coverPhotoUrl?: string | null
  coverPhotoPath?: string | null
  status: CharityEventStatus
  isPublic?: boolean
  totalCollectedAmount: number
  totalContributionsCount: number
  totalParticipantsCount: number
  totalGroupsCount: number
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

/**
 * Type de participant à un évènement de charité
 */
export type CharityParticipantType = 'member' | 'group'

/**
 * Participant à un évènement de charité
 */
export interface CharityParticipant {
  id: string
  eventId: string
  participantType: CharityParticipantType
  memberId?: string // User.id
  groupId?: string  // Group.id
  totalAmount: number
  contributionsCount: number
  lastContributionAt?: Date
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

/**
 * Type de contribution à un évènement de charité
 */
export type CharityContributionType = 'money' | 'in_kind'

/**
 * Statut d'une contribution
 */
export type CharityContributionStatus = 'pending' | 'confirmed' | 'canceled'

/**
 * Contribution à un évènement de charité
 */
export interface CharityContribution {
  id: string
  eventId: string
  participantId: string
  contributionType: CharityContributionType
  contributionDate?: Date
  payment?: Payment & { paymentType: 'Charity' }
  inKindDescription?: string
  estimatedValue?: number
  notes?: string
  proofUrl?: string
  proofPath?: string
  proofType?: 'image' | 'pdf' | 'other'
  receiptUrl?: string // PDF généré style CaisseImprevuePDF
  receiptPath?: string
  status: CharityContributionStatus
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

export type CharityContributionInput = Omit<
  CharityContribution,
  'id' | 'participantId' | 'eventId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
>

/**
 * Contribution enrichie avec les données du participant
 */
export interface EnrichedCharityContribution extends CharityContribution {
  participant?: {
    type: CharityParticipantType
    name: string
    groupName?: string
    photoURL?: string
  }
}

/**
 * Type de média pour un évènement de charité
 */
export type CharityMediaType = 'photo' | 'video'

/**
 * Média lié à un évènement de charité
 */
export interface CharityMedia {
  id: string
  eventId: string
  type: CharityMediaType
  url: string
  path: string
  thumbnailUrl?: string
  thumbnailPath?: string
  title?: string
  description?: string
  takenAt?: Date
  createdAt: Date
  createdBy: string
}

/**
 * Filtres pour la recherche d'évènements de charité
 */
export interface CharityEventFilters {
  status?: CharityEventStatus | 'all'
  dateFrom?: Date
  dateTo?: Date
  searchQuery?: string
  page?: number
  limit?: number
  orderByField?: string
  orderByDirection?: 'asc' | 'desc'
  lastDoc?: any // Document Firestore pour pagination
}

/**
 * Statistiques globales des évènements de charité
 */
export interface CharityGlobalStats {
  totalEventsThisYear: number
  totalCollectedAmount: number
  totalParticipants: number
  nextUpcomingEvent?: CharityEvent
}

// Labels français pour les statuts d'évènements de charité
export const CHARITY_EVENT_STATUS_LABELS: Record<CharityEventStatus, string> = {
  draft: 'Brouillon',
  upcoming: 'À venir',
  ongoing: 'En cours',
  closed: 'Terminé',
  archived: 'Archivé'
}

// ================== TYPES POUR LE MODULE VÉHICULE ==================

export type VehicleInsuranceStatus = 'active' | 'expires_soon' | 'expired'

export type VehicleType = 'car' | 'motorcycle' | 'truck' | 'bus' | 'maison' | 'other'

export type VehicleEnergySource = 'essence' | 'diesel' | 'electrique' | 'hybride' | 'gaz' | 'autre'

export type VehicleInsuranceHolderType = 'member' | 'non-member'

export interface VehicleInsurance {
  id: string
  holderType: VehicleInsuranceHolderType
  city?: string
  primaryPhone?: string
  
  // Champs pour membre (si holderType === 'member')
  memberId?: string
  memberFirstName?: string
  memberLastName?: string
  memberMatricule?: string
  memberContacts?: string[]
  memberPhotoUrl?: string | null
  
  // Champs pour non-membre (si holderType === 'non-member')
  nonMemberFirstName?: string
  nonMemberLastName?: string
  nonMemberPhone1?: string
  nonMemberPhone2?: string | null
  
  sponsorMemberId?: string | null
  sponsorName?: string | null
  sponsorMatricule?: string | null
  sponsorContacts?: string[]
  vehicleType: VehicleType
  vehicleBrand?: string
  vehicleModel?: string
  vehicleYear?: number
  plateNumber?: string
  energySource?: VehicleEnergySource
  fiscalPower?: string
  insuranceCompany: string
  policyNumber: string
  warrantyMonths?: number
  premiumAmount: number
  currency: string
  startDate: Date
  endDate: Date
  status: VehicleInsuranceStatus
  notes?: string
  attachments?: {
    policyUrl?: string
    policyPath?: string
    receiptUrl?: string
    receiptPath?: string
  }
  renewalCount?: number
  lastRenewedAt?: Date
  createdAt: Date
  createdBy: string
  updatedAt: Date
  updatedBy?: string
}

export interface VehicleInsuranceFilters {
  status?: VehicleInsuranceStatus | 'all'
  insuranceCompany?: string
  vehicleType?: VehicleType | 'all'
  searchQuery?: string
  sponsorMemberId?: string
  alphabeticalOrder?: 'asc' | 'desc'
  holderType?: VehicleInsuranceHolderType | 'all' // Filtrer par type de titulaire
  page?: number
  limit?: number
  orderByField?: string
  orderByDirection?: 'asc' | 'desc'
}

export interface VehicleInsuranceListResult {
  items: VehicleInsurance[]
  total: number
  page: number
  limit: number
  hasNextPage: boolean
  hasPrevPage: boolean
  nextCursor?: any
}

export interface VehicleInsuranceStats {
  totalInsured: number
  active: number
  expiresSoon: number
  expired: number
  membersCount: number // Nombre d'assurances pour membres
  nonMembersCount: number // Nombre d'assurances pour non-membres
  byCompany: Array<{ company: string; count: number }>
  byVehicleType: Array<{ type: VehicleType; count: number }>
  expiringSoonList: VehicleInsurance[]
}

export const VEHICLE_INSURANCE_STATUS_LABELS: Record<VehicleInsuranceStatus, string> = {
  active: 'Active',
  expires_soon: 'Expire bientôt',
  expired: 'Expirée'
}

// ================== TYPES PLACEMENT ==================

export type PlacementStatus = 'Draft' | 'Active' | 'Closed' | 'EarlyExit' | 'Canceled'
export type CommissionStatus = 'Due' | 'Paid' | 'Partial' | 'Canceled'
export type PayoutMode = 'MonthlyCommission_CapitalEnd' | 'CapitalPlusCommission_End'
export type PlacementDemandStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED'

// Types de documents placement : on réutilise DocumentType existant en ajoutant si besoin des variantes placement
export type PlacementDocumentType = DocumentType | 'PLACEMENT_CONTRACT' | 'PLACEMENT_COMMISSION_PROOF' | 'PLACEMENT_EARLY_EXIT_QUITTANCE' | 'PLACEMENT_FINAL_QUITTANCE' | 'PLACEMENT_EARLY_EXIT_ADDENDUM' | 'PLACEMENT_EARLY_EXIT_DOCUMENT'

export interface Placement {
  id: string
  benefactorId: string // User.id avec rôle Bienfaiteur
  benefactorName?: string
  benefactorPhone?: string
  urgentContact?: {
    name: string
    firstName?: string
    phone: string
    phone2?: string
    relationship?: string
    idNumber?: string
    typeId?: string
    documentPhotoUrl?: string
  }
  amount: number
  rate: number // taux de commission
  periodMonths: number // 1..7
  payoutMode: PayoutMode
  status: PlacementStatus
  startDate?: Date
  endDate?: Date
  nextCommissionDate?: Date
  hasOverdueCommission?: boolean
  contractDocumentId?: string // Référence Document.id
  finalQuittanceDocumentId?: string
  earlyExitQuittanceDocumentId?: string
  earlyExitAddendumDocumentId?: string
  closingReason?: string // Motif de clôture du placement
  createdAt: Date
  updatedAt: Date
  createdBy: string // User.id (Admin)
  updatedBy?: string // User.id (Admin)
}

export interface CommissionPaymentPlacement {
  id: string
  placementId: string
  dueDate: Date
  amount: number
  status: CommissionStatus
  proofDocumentId?: string // Document.id
  receiptDocumentId?: string // Reçu / quittance payée
  paidAt?: Date
  createdAt: Date
  updatedAt: Date
  createdBy: string // User.id (Admin)
  updatedBy?: string // User.id (Admin)
}

export interface EarlyExitPlacement {
  id: string
  placementId: string
  requestedAt: Date
  validatedAt?: Date
  commissionDue: number
  payoutAmount: number
  reason?: string // Motif du retrait anticipé
  documentPdfId?: string // Document.id du PDF de retrait anticipé signé
  quittanceDocumentId?: string // Document.id
  createdAt: Date
  updatedAt: Date
  createdBy: string // User.id (Admin)
  updatedBy?: string // User.id (Admin)
}

/**
 * Interface pour une demande de placement
 */
export interface PlacementDemand {
  id: string // Format: MK_DEMANDE_PL_{matriculeBienfaiteur}_{date}_{heure}
  
  // Informations du bienfaiteur
  benefactorId: string // User.id avec rôle Bienfaiteur (obligatoire)
  benefactorName?: string // Nom complet du bienfaiteur (prérempli)
  benefactorPhone?: string // Téléphone du bienfaiteur (prérempli)
  
  // Informations de la demande
  amount: number // Montant du placement souhaité (FCFA)
  rate: number // Taux de commission souhaité (0-100)
  periodMonths: number // Durée souhaitée (1-7 mois)
  payoutMode: 'MonthlyCommission_CapitalEnd' | 'CapitalPlusCommission_End' // Mode de paiement souhaité
  desiredDate: string // Date souhaitée pour le début du placement (format: YYYY-MM-DD)
  cause?: string // Raison de la demande (optionnel)
  
  // Contact d'urgence (optionnel)
  urgentContact?: {
    name: string
    firstName?: string
    phone: string
    phone2?: string
    relationship?: string
    idNumber?: string
    typeId?: string
    documentPhotoUrl?: string
    memberId?: string
  }
  
  // Statut et décision
  status: PlacementDemandStatus
  
  // Traçabilité de l'acceptation/refus
  decisionMadeAt?: Date // Date de la décision
  decisionMadeBy?: string // ID de l'agent qui a pris la décision
  decisionMadeByName?: string // Nom complet de l'agent (prénom + nom)
  decisionReason?: string // Raison de l'acceptation ou du refus
  
  // Traçabilité de la réouverture (si refusée puis réouverte)
  reopenedAt?: Date // Date de la réouverture
  reopenedBy?: string // ID de l'agent qui a réouvert la demande
  reopenedByName?: string // Nom complet de l'agent qui a réouvert (prénom + nom)
  reopenReason?: string // Motif de la réouverture
  
  // Lien vers le placement créé (si convertie)
  placementId?: string // ID du placement créé depuis cette demande
  
  // Métadonnées
  createdAt: Date
  updatedAt: Date
  createdBy: string // ID de l'agent qui a créé la demande
  updatedBy?: string // ID de l'agent qui a modifié la demande
}

/**
 * Filtres pour la recherche de demandes de placement
 */
export interface PlacementDemandFilters {
  status?: PlacementDemandStatus | 'all'
  benefactorId?: string // Filtrer par bienfaiteur
  payoutMode?: 'MonthlyCommission_CapitalEnd' | 'CapitalPlusCommission_End' | 'all'
  decisionMadeBy?: string // Filtrer par agent qui a pris la décision
  createdAtFrom?: Date // Filtre par date de création (début)
  createdAtTo?: Date // Filtre par date de création (fin)
  desiredDateFrom?: Date // Filtre par date souhaitée (début)
  desiredDateTo?: Date // Filtre par date souhaitée (fin)
  search?: string // Recherche textuelle (nom du bienfaiteur, ID de la demande, etc.)
  page?: number
  limit?: number
}

/**
 * Statistiques des demandes de placement
 */
export interface PlacementDemandStats {
  total: number // Total de toutes les demandes
  pending: number // Demandes en attente
  approved: number // Demandes acceptées
  rejected: number // Demandes refusées
  converted: number // Demandes converties en placements
  totalAmount: number // Montant total des demandes (toutes statuts confondus)
  pendingAmount: number // Montant total des demandes en attente
}

// ================== TYPES POUR LES DEMANDES CAISSE IMPREVUE ==================

export type CaisseImprevueDemandStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED' | 'REOPENED'

/**
 * Interface pour une demande de contrat Caisse Imprévue
 */
export interface CaisseImprevueDemand {
  id: string // Format: MK_DEMANDE_CI_{matricule}_{date}_{heure}
  
  // Informations du demandeur
  memberId: string // ID du membre (obligatoire)
  memberFirstName?: string // Prénom du membre (prérempli)
  memberLastName?: string // Nom du membre (prérempli)
  memberContacts?: string[] // Contacts du membre (prérempli)
  memberEmail?: string // Email du membre (prérempli)
  
  // Informations du forfait souhaité (Step 2)
  subscriptionCIID: string // ID du forfait Caisse Imprévue
  subscriptionCICode: string // Code du forfait (ex: "CI_DAILY_1000")
  subscriptionCILabel?: string // Libellé du forfait (prérempli)
  subscriptionCIAmountPerMonth: number // Montant mensuel du forfait
  subscriptionCINominal: number // Montant nominal du forfait
  subscriptionCIDuration: number // Durée du forfait (en mois)
  subscriptionCISupportMin?: number // Montant minimum de support
  subscriptionCISupportMax?: number // Montant maximum de support
  
  // Fréquence de paiement souhaitée
  paymentFrequency: 'DAILY' | 'MONTHLY' // Fréquence de paiement souhaitée
  
  // Date souhaitée pour le début du contrat
  desiredDate: string // Date souhaitée pour le début du contrat (format: YYYY-MM-DD)
  firstPaymentDate?: string // Date du premier paiement (calculée ou définie)
  
  // Contact d'urgence (Step 3)
  emergencyContact?: EmergencyContactCI
  
  // Motif de la demande (obligatoire)
  cause: string // Motif de la demande (obligatoire, 10-500 caractères)
  
  // Statut et décision
  status: CaisseImprevueDemandStatus
  
  // Traçabilité de l'acceptation/refus
  decisionMadeAt?: Date // Date de la décision
  decisionMadeBy?: string // ID de l'agent qui a pris la décision
  decisionMadeByName?: string // Nom complet de l'agent (prénom + nom)
  decisionReason?: string // Raison de l'acceptation ou du refus
  
  // Traçabilité de la réouverture (si refusée puis réouverte)
  reopenedAt?: Date // Date de la réouverture
  reopenedBy?: string // ID de l'agent qui a réouvert la demande
  reopenedByName?: string // Nom complet de l'agent qui a réouvert (prénom + nom)
  reopenReason?: string // Motif de la réouverture
  
  // Lien vers le contrat créé (si convertie)
  contractId?: string // ID du contrat créé depuis cette demande
  
  // Métadonnées
  createdAt: Date
  updatedAt: Date
  createdBy: string // ID de l'agent qui a créé la demande
  updatedBy?: string // ID de l'agent qui a modifié la demande
}

/**
 * Filtres pour la recherche de demandes Caisse Imprévue
 */
export interface CaisseImprevueDemandFilters {
  status?: CaisseImprevueDemandStatus | 'all'
  paymentFrequency?: 'DAILY' | 'MONTHLY' | 'all' // Filtrer par fréquence de paiement
  subscriptionCIID?: string // Filtrer par forfait
  memberId?: string // Filtrer par membre
  decisionMadeBy?: string // Filtrer par agent qui a pris la décision
  createdAtFrom?: Date // Filtre par date de création (début)
  createdAtTo?: Date // Filtre par date de création (fin)
  desiredDateFrom?: Date // Filtre par date souhaitée (début)
  desiredDateTo?: Date // Filtre par date souhaitée (fin)
  search?: string // Recherche textuelle (nom du membre, ID de la demande, etc.)
  page?: number
  limit?: number
}

/**
 * Statistiques des demandes Caisse Imprévue
 */
export interface CaisseImprevueDemandStats {
  total: number // Total de toutes les demandes
  pending: number // Demandes en attente
  approved: number // Demandes acceptées
  rejected: number // Demandes refusées
  converted: number // Demandes converties en contrats
  reopened: number // Demandes réouvertes
  daily: number // Demandes avec fréquence DAILY
  monthly: number // Demandes avec fréquence MONTHLY
  totalAmount: number // Montant total des forfaits demandés (toutes statuts confondus)
  pendingAmount: number // Montant total des forfaits en attente
}

// ================== TYPES POUR LES FILLEULS ==================

/**
 * Interface pour les filleuls (membres parrainés)
 */
export interface Filleul {
  lastName: string
  firstName: string
  matricule: string
  photoURL?: string | null
  photoPath?: string | null
  createdAt: Date
}

// ================== EXPORTS ==================
// Pas besoin d'exporter depuis schemas.ts car tout est défini ici

// Labels français pour l'affichage des statuts
export const MEMBERSHIP_STATUS_LABELS: Record<MembershipRequestStatus, string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Rejetée',
  under_review: 'En cours de traitement'
}

// Labels étendus incluant les demandes supprimées
export const EXTENDED_MEMBERSHIP_STATUS_LABELS: Record<ExtendedMembershipRequestStatus, string> = {
  ...MEMBERSHIP_STATUS_LABELS,
  deleted: 'Supprimée'
}

// Labels pour les types de membres
export const MEMBERSHIP_TYPE_LABELS: Record<MembershipType, string> = {
  adherant: 'Adhérant',
  bienfaiteur: 'Bienfaiteur',
  sympathisant: 'Sympathisant'
}

// Labels pour les rôles utilisateur
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  Adherant: 'Adhérant',
  Bienfaiteur: 'Bienfaiteur',
  Sympathisant: 'Sympathisant',
  Admin: 'Administrateur',
  SuperAdmin: 'Super Administrateur',
  Secretary: 'Secrétaire'
}

// Rôles considérés comme administrateurs
export const ADMIN_ROLES: UserRole[] = ['Admin', 'SuperAdmin', 'Secretary']

// Labels pour les statuts de contrats Caisse Imprévue
export const CONTRACT_CI_STATUS_LABELS: Record<ContractCIStatus, string> = {
  ACTIVE: 'En cours',
  FINISHED: 'Terminé',
  CANCELED: 'Résilié'
}

export type Admin = {
  id?: string
  firstName: string
  lastName: string
  birthDate: string
  civility: 'Monsieur' | 'Madame' | 'Mademoiselle'
  gender: 'Homme' | 'Femme'
  email?: string
  contacts: string[] 
  roles: UserRole[] 
  photoURL?: string | null
  photoPath?: string | null
  isActive?: boolean
  createdBy?: string
  updatedBy?: string
  createdAt?: Date
  updatedAt?: Date
}
export interface PhotonResult {
  properties: {
    name: string
    city?: string
    county?: string
    state: string
    country: string
    postcode?: string
    housenumber?: string
    street?: string
    district?: string
    suburb?: string
    neighbourhood?: string
    osm_key?: string
    osm_value?: string
    type?: string
  }
  geometry: {
    coordinates: [number, number]
  }
}

// ================== TYPES GÉOGRAPHIE ==================

/**
 * Province - Entité géographique de niveau 1
 */
export interface Province {
  id: string
  code: string // Code unique (ex: "ESTuaire", "OGOUE_MARITIME")
  name: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

/**
 * Département - Entité géographique de niveau 2 (appartient à une Province)
 */
export interface Department {
  id: string
  provinceId: string
  name: string
  code?: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

/**
 * Commune (ou Ville) - Entité géographique de niveau 3 (appartient à un Département)
 */
export interface Commune {
  id: string
  departmentId: string
  name: string
  postalCode?: string
  alias?: string // "Ville" si applicable
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

/**
 * Arrondissement - Entité géographique de niveau 4 (appartient à une Commune)
 */
export interface District {
  id: string
  communeId: string
  name: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

/**
 * Quartier - Entité géographique de niveau 5 (appartient à un Arrondissement)
 */
export interface Quarter {
  id: string
  districtId: string
  name: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

// ================== TYPES AGENTS DE RECOUVREMENT ==================

/**
 * Type de pièce d'identité
 */
export type PieceIdentiteType = 'CNI' | 'Passport' | 'Carte scolaire' | 'Carte étrangère' | 'Carte consulaire'

/**
 * Pièce d'identité d'un agent de recouvrement
 */
export interface PieceIdentite {
  type: PieceIdentiteType
  numero: string
  dateDelivrance: Date
  dateExpiration: Date
}

/**
 * Sexe de l'agent
 */
export type AgentRecouvrementSexe = 'M' | 'F'

/**
 * Agent de recouvrement - personne chargée de collecter les paiements terrain
 */
export interface AgentRecouvrement {
  id: string
  nom: string
  prenom: string
  sexe: AgentRecouvrementSexe
  pieceIdentite: PieceIdentite
  dateNaissance: Date
  birthMonth?: number // 1-12, dérivé de dateNaissance (tab Anniversaires)
  birthDay?: number // 1-31, dérivé de dateNaissance (tab Anniversaires)
  lieuNaissance: string
  tel1: string
  tel2?: string
  photoUrl?: string | null
  photoPath?: string | null
  actif: boolean
  searchableTextLastNameFirst: string
  searchableTextFirstNameFirst: string
  searchableTextNumeroFirst: string
  createdBy: string
  createdAt: Date
  updatedBy?: string
  updatedAt: Date
}

/**
 * Filtres pour la liste des agents
 */
export type AgentRecouvrementFilterTab = 'actifs' | 'tous' | 'inactifs' | 'anniversaires'

export interface AgentsFilters {
  tab?: AgentRecouvrementFilterTab
  searchQuery?: string
  orderByField?: 'nom' | 'prenom' | 'createdAt'
  orderByDirection?: 'asc' | 'desc'
  page?: number
  limit?: number
}

/**
 * Statistiques des agents
 */
export interface AgentsStats {
  total: number
  actifs: number
  inactifs: number
  hommes: number
  femmes: number
  anniversairesMois: number
}
