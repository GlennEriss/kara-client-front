// ================== TYPES CENTRALISÉS ==================

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

export type PaymentMode = 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer'
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
  id: string
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
  createdAt: Date
  updatedAt: Date
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
