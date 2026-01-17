/**
 * Constantes centralisées pour le module de gestion des demandes d'adhésion
 * 
 * Ce fichier centralise toutes les valeurs constantes utilisées dans le module
 * membership-requests pour éviter la dispersion et faciliter la maintenance.
 */

// ============================================
// NOMS DE COLLECTIONS FIRESTORE
// ============================================
export const MEMBERSHIP_REQUEST_COLLECTIONS = {
  /** Nom de la collection Firestore pour les demandes d'adhésion */
  REQUESTS: 'membership-requests',
  
  /** Nom de la collection Firestore pour les utilisateurs */
  USERS: 'users',
  
  /** Nom de la collection Firestore pour les membres */
  MEMBERS: 'members',
  
  /** Nom de la collection Firestore pour les abonnements */
  SUBSCRIPTIONS: 'subscriptions',
  
  /** Nom de la collection Firestore pour les notifications */
  NOTIFICATIONS: 'notifications',
} as const

// ============================================
// CONFIGURATION CODE DE SÉCURITÉ
// ============================================
export const MEMBERSHIP_REQUEST_SECURITY_CODE = {
  /** Longueur du code de sécurité (en chiffres) */
  LENGTH: 6,
  
  /** Durée d'expiration du code (en heures) */
  EXPIRY_HOURS: 48,
  
  /** Nombre maximum de tentatives avant blocage */
  MAX_ATTEMPTS: 5,
  
  /** Fenêtre de temps pour les tentatives (en heures) */
  ATTEMPT_WINDOW_HOURS: 1,
  
  /** Plage minimale du code généré */
  MIN_VALUE: 100000,
  
  /** Plage maximale du code généré */
  MAX_VALUE: 999999,
} as const

// ============================================
// CONFIGURATION PAGINATION
// ============================================
export const MEMBERSHIP_REQUEST_PAGINATION = {
  /** Nombre d'éléments par page par défaut */
  DEFAULT_LIMIT: 10,
  
  /** Nombre maximum d'éléments par page */
  MAX_LIMIT: 100,
  
  /** Limite utilisée pour les statistiques (récupération complète) */
  STATS_LIMIT: 1000,
  
  /** Options de limite disponibles dans le sélecteur */
  LIMIT_OPTIONS: [10, 25, 50, 100] as const,
  
  /** Nombre de pages affichées dans la pagination avant/après la page actuelle */
  PAGES_AROUND_CURRENT: 2,
} as const

// ============================================
// CONFIGURATION CACHE REACT QUERY
// ============================================
export const MEMBERSHIP_REQUEST_CACHE = {
  /** Clé de query React Query pour les demandes */
  QUERY_KEY: 'membership-requests',
  
  /** Clé de query React Query pour les statistiques */
  STATS_QUERY_KEY: 'membership-requests-stats',
  
  /** Durée avant qu'une donnée soit considérée comme stale (ms) */
  STALE_TIME_MS: 1000 * 60 * 5, // 5 minutes
  
  /** Durée de garde en cache après inutilisation (ms) */
  GC_TIME_MS: 1000 * 60 * 10, // 10 minutes
  
  /** Durée de cache pour les statistiques (plus long car moins fréquemment mises à jour) */
  STATS_STALE_TIME_MS: 1000 * 60 * 60, // 1 heure
  
  /** Durée de cache pour les statistiques après inutilisation (ms) */
  STATS_GC_TIME_MS: 1000 * 60 * 60 * 2, // 2 heures
} as const

// ============================================
// VALIDATION DES DONNÉES
// ============================================
export const MEMBERSHIP_REQUEST_VALIDATION = {
  /** Longueur minimale d'un numéro de téléphone */
  MIN_PHONE_LENGTH: 8,
  
  /** Longueur maximale d'un numéro de téléphone */
  MAX_PHONE_LENGTH: 15,
  
  /** Longueur minimale d'un nom/prénom */
  MIN_NAME_LENGTH: 2,
  
  /** Longueur maximale d'un nom/prénom */
  MAX_NAME_LENGTH: 100,
  
  /** Longueur minimale d'un email */
  MIN_EMAIL_LENGTH: 5,
  
  /** Longueur maximale d'un email */
  MAX_EMAIL_LENGTH: 255,
  
  /** Longueur minimale d'une adresse */
  MIN_ADDRESS_LENGTH: 5,
  
  /** Longueur maximale d'une adresse */
  MAX_ADDRESS_LENGTH: 500,
  
  /** Longueur maximale d'un commentaire admin */
  MAX_ADMIN_COMMENT_LENGTH: 1000,
  
  /** Longueur maximale d'un motif de rejet */
  MAX_REJECTION_REASON_LENGTH: 500,
  
  /** Longueur maximale des corrections demandées */
  MAX_CORRECTION_NOTE_LENGTH: 2000,
} as const

// ============================================
// CONFIGURATION RECHERCHE
// ============================================
export const MEMBERSHIP_REQUEST_SEARCH = {
  /** Délai de debounce pour la recherche (ms) */
  DEBOUNCE_MS: 300,
  
  /** Nombre minimum de caractères pour déclencher une recherche */
  MIN_SEARCH_LENGTH: 1,
  
  /** Nombre maximum de caractères dans une recherche */
  MAX_SEARCH_LENGTH: 100,
  
  /** Champs de recherche disponibles */
  SEARCHABLE_FIELDS: [
    'identity.firstName',
    'identity.lastName',
    'identity.email',
    'identity.contacts',
    'matricule',
  ] as const,
} as const

// ============================================
// STATUTS ET LABELS
// ============================================
export const MEMBERSHIP_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  UNDER_REVIEW: 'under_review',
  ALL: 'all',
} as const

export const MEMBERSHIP_REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Rejetée',
  under_review: 'En cours d\'examen',
  all: 'Toutes',
} as const

// ============================================
// TYPES DE MEMBRES
// ============================================
export const MEMBERSHIP_TYPES = {
  ADHERENT: 'adherant',
  BIENFAITEUR: 'bienfaiteur',
  SYMPATHISANT: 'sympathisant',
} as const

export const MEMBERSHIP_TYPE_LABELS: Record<string, string> = {
  adherant: 'Adhérent',
  bienfaiteur: 'Bienfaiteur',
  sympathisant: 'Sympathisant',
} as const

// ============================================
// MODES DE PAIEMENT
// ============================================
export const PAYMENT_MODES = {
  AIRTEL_MONEY: 'airtel_money',
  MOBICASH: 'mobicash',
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  OTHER: 'other',
} as const

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  airtel_money: 'Airtel Money',
  mobicash: 'Mobicash',
  cash: 'Espèces',
  bank_transfer: 'Virement bancaire',
  other: 'Autre',
} as const

// ============================================
// TYPES DE PAIEMENT
// ============================================
export const PAYMENT_TYPES = {
  MEMBERSHIP: 'Membership',
  SUBSCRIPTION: 'Subscription',
  TONTINE: 'Tontine',
  CHARITY: 'Charity',
} as const

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  Membership: 'Adhésion',
  Subscription: 'Souscription',
  Tontine: 'Tontine',
  Charity: 'Bienfaisance',
} as const

// ============================================
// PATHS FIREBASE STORAGE
// ============================================
export const MEMBERSHIP_REQUEST_STORAGE_PATHS = {
  /** Chemin pour les photos des demandeurs */
  PHOTOS: 'membership-photos',
  
  /** Chemin pour les documents (pièces d'identité) */
  DOCUMENTS: 'membership-documents',
  
  /** Chemin pour les PDFs d'adhésion */
  ADHESION_PDFS: 'membership-adhesion-pdfs',
} as const

// ============================================
// NOMS DE FICHIERS
// ============================================
export const MEMBERSHIP_REQUEST_FILE_NAMES = {
  /** Format du nom de fichier PDF d'adhésion */
  ADHESION_PDF_FORMAT: (firstName: string, lastName: string, year: number) =>
    `${firstName}_${lastName}_ADHESION_MK_${year}.pdf`,
  
  /** Format du nom de fichier PDF d'adhésion pour Firebase Storage */
  ADHESION_PDF_STORAGE_FORMAT: (firstName: string, lastName: string, startYear: number, endYear: number) =>
    `${firstName}_${lastName}_${startYear}-${endYear}.pdf`,
} as const

// ============================================
// URLS ET ROUTES
// ============================================
export const MEMBERSHIP_REQUEST_ROUTES = {
  /** Route de base pour les demandes d'adhésion (admin) */
  BASE: '/membership-requests',
  
  /** Route pour les détails d'une demande */
  DETAILS: (id: string) => `/membership-requests/${id}`,
  
  /** Route pour la correction (côté demandeur) */
  CORRECTION: (requestId: string) => `/register?requestId=${requestId}`,
  
  /** Route API pour l'approbation */
  API_APPROVE: '/api/membership/approve',
  
  /** Route API pour créer un utilisateur Firebase */
  API_CREATE_USER: '/api/create-firebase-user',
  
  /** Route API pour créer un utilisateur Firebase avec email/password */
  API_CREATE_USER_EMAIL_PWD: '/api/create-firebase-user-email-pwd',
} as const

// ============================================
// COULEURS UI (pour badges, statuts, etc.)
// ============================================
export const MEMBERSHIP_REQUEST_COLORS = {
  STATUS: {
    pending: '#f59e0b',      // Amber
    approved: '#10b981',     // Emerald
    rejected: '#ef4444',     // Red
    under_review: '#3b82f6', // Blue
  },
  
  PAYMENT: {
    paid: '#10b981',   // Emerald
    unpaid: '#ef4444', // Red
  },
} as const

// ============================================
// CONFIGURATION UI AVEC ICÔNES (pour badges, etc.)
// ============================================
// Note: Les icônes seront importées depuis lucide-react dans les composants
export const MEMBERSHIP_REQUEST_UI_COLORS = {
  STATUS: {
    pending: {
      label: MEMBERSHIP_REQUEST_STATUS_LABELS.pending,
      badge: 'bg-amber-100 text-amber-800 border border-amber-200',
      icon: 'Clock', // lucide-react
    },
    approved: {
      label: MEMBERSHIP_REQUEST_STATUS_LABELS.approved,
      badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      icon: 'CheckCircle', // lucide-react
    },
    rejected: {
      label: MEMBERSHIP_REQUEST_STATUS_LABELS.rejected,
      badge: 'bg-red-100 text-red-800 border border-red-200',
      icon: 'XCircle', // lucide-react
    },
    under_review: {
      label: MEMBERSHIP_REQUEST_STATUS_LABELS.under_review,
      badge: 'bg-blue-100 text-blue-800 border border-blue-200',
      icon: 'FileSearch', // lucide-react
    },
  },
  
  PAYMENT: {
    paid: {
      label: 'Payé',
      badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      icon: 'CheckCircle', // lucide-react
    },
    unpaid: {
      label: 'Non payé',
      badge: 'bg-red-100 text-red-800 border border-red-200',
      icon: 'XCircle', // lucide-react
    },
  },
} as const

// ============================================
// MESSAGES ET TEXTES
// ============================================
export const MEMBERSHIP_REQUEST_MESSAGES = {
  /** Message affiché quand aucune demande n'est trouvée */
  NO_REQUESTS: 'Aucune demande d\'adhésion trouvée',
  
  /** Message affiché pendant le chargement */
  LOADING: 'Chargement des demandes...',
  
  /** Message d'erreur générique */
  ERROR: 'Une erreur est survenue lors du chargement des demandes',
  
  /** Message de succès pour l'approbation */
  APPROVAL_SUCCESS: (matricule: string) => 
    `Demande approuvée avec succès. Matricule: ${matricule}`,
  
  /** Message de succès pour le rejet */
  REJECTION_SUCCESS: 'Demande rejetée avec succès',
  
  /** Message de succès pour la demande de corrections */
  CORRECTION_REQUEST_SUCCESS: 'Corrections demandées avec succès',
  
  /** Message de succès pour le paiement */
  PAYMENT_SUCCESS: 'Paiement enregistré avec succès',
  
  /** Message d'erreur pour le paiement requis */
  PAYMENT_REQUIRED: 'Le paiement est requis avant d\'approuver la demande',
  
  /** Message pour le code de sécurité renouvelé */
  CODE_RENEWED: (code: string) => `Code de sécurité renouvelé: ${code}`,
} as const

// ============================================
// CONFIGURATION WHATSAPP
// ============================================
export const MEMBERSHIP_REQUEST_WHATSAPP = {
  /** URL de base pour WhatsApp Web */
  BASE_URL: 'https://wa.me',
  
  /** Préfixe international pour le Gabon */
  COUNTRY_CODE: '+241',
  
  /** Format du message pour les corrections */
  CORRECTION_MESSAGE: (name: string, corrections: string, link: string, code: string) =>
    `Bonjour ${name},\n\n` +
    `Votre demande d'adhésion nécessite des corrections.\n\n` +
    `Corrections à apporter:\n${corrections}\n\n` +
    `Lien de correction: ${link}\n` +
    `Code de sécurité: ${code}\n\n` +
    `Cordialement,\nKARA Mutuelle`,
  
  /** Format du message pour l'approbation */
  APPROVAL_MESSAGE: (name: string, matricule: string) =>
    `Bonjour ${name},\n\n` +
    `Votre demande d'adhésion a été approuvée !\n\n` +
    `Votre matricule: ${matricule}\n\n` +
    `Cordialement,\nKARA Mutuelle`,
  
  /** Format du message pour le rejet */
  REJECTION_MESSAGE: (name: string, reason?: string) =>
    `Bonjour ${name},\n\n` +
    `Votre demande d'adhésion a été rejetée.\n${reason ? `\nMotif: ${reason}\n` : ''}\n` +
    `Cordialement,\nKARA Mutuelle`,
} as const

// ============================================
// EXPORTS TYPES
// ============================================
export type MembershipRequestStatusType = typeof MEMBERSHIP_REQUEST_STATUS[keyof typeof MEMBERSHIP_REQUEST_STATUS]
export type MembershipType = typeof MEMBERSHIP_TYPES[keyof typeof MEMBERSHIP_TYPES]
export type PaymentMode = typeof PAYMENT_MODES[keyof typeof PAYMENT_MODES]
export type PaymentType = typeof PAYMENT_TYPES[keyof typeof PAYMENT_TYPES]
