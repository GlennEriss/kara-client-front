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
    firstName: string;
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
    identityDocumentNumber: string;
    documentPhotoFront?: string | File;
    documentPhotoBack?: string | File;
    expirationDate: string;
    issuingPlace: string;
    issuingDate: string;
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

  // Commentaires administratifs
  adminComments?: string

  // Numéro de membre attribué (si approuvé)
  memberNumber?: string
  reviewNote?: string;
  // Motif de rejet (raison fournie par l'admin)
  motifReject?: string;
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
}

export type PaymentMode = 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer' | 'other'
export interface Payment {
  date: Date
  mode: PaymentMode
  amount: number
  acceptedBy: string
  paymentType: TypePayment
  // Nouveaux champs
  time?: string // HH:mm
  withFees?: boolean
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
  caisseType: 'STANDARD' | 'JOURNALIERE' | 'LIBRE'
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
  caisseType: 'STANDARD' | 'JOURNALIERE' | 'LIBRE'
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
  emergencyContact?: EmergencyContact
  createdAt: Date
  updatedAt: Date
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

/**
 * Formats de documents possibles
 */
export type DocumentFormat = 
  | 'pdf'
  | 'word'
  | 'excel'
  | 'image'
  | 'text'

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

export type VehicleType = 'car' | 'motorcycle' | 'truck' | 'bus' | 'other'

export interface VehicleInsurance {
  id: string
  memberId: string
  memberFirstName: string
  memberLastName: string
  memberMatricule?: string
  memberContacts?: string[]
  memberPhotoUrl?: string | null
  sponsorMemberId?: string
  sponsorName?: string
  vehicleType: VehicleType
  vehicleBrand?: string
  vehicleModel?: string
  vehicleYear?: number
  plateNumber?: string
  insuranceCompany: string
  insuranceAgent?: string
  policyNumber: string
  coverageType?: string
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
  byCompany: Array<{ company: string; count: number }>
  byVehicleType: Array<{ type: VehicleType; count: number }>
  expiringSoonList: VehicleInsurance[]
}

export const VEHICLE_INSURANCE_STATUS_LABELS: Record<VehicleInsuranceStatus, string> = {
  active: 'Active',
  expires_soon: 'Expire bientôt',
  expired: 'Expirée'
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
