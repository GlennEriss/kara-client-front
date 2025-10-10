import { z } from 'zod'
import { RelationshipEnum } from '@/schemas/emergency-contact.schema'
import { identitySchema, CivilityEnum, GenderEnum, identityDefaultValues } from './identity.schema'
import { addressSchema, addressDefaultValues } from './address.schema'
import { companySchema, companyCrudSchema, companyDefaultValues } from './company.schema'

// Énumérations pour les options fixes (valeurs en français)
export const IdentityDocumentEnum = z.enum([
  'Passeport',
  'Carte de séjour',
  'Carte scolaire',
  'Carte consulaire',
  'NIP',
  'CNI',
  'Autre'
])

export const InsuranceTypeEnum = z.enum([
  'Assurance maladie',
  'Assurance vie',
  'Assurance auto',
  'Assurance habitation',
  'Assurance voyage',
  'Assurance professionnelle',
  'Mutuelle santé',
  'Assurance responsabilité civile',
  'Autre'
])



// ================== STEP 4: PIÈCES D'IDENTITÉ ==================
export const documentsSchema = z.object({
  identityDocument: IdentityDocumentEnum,

  identityDocumentNumber: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string()
      .min(3, 'Le numéro de la pièce d\'identité doit contenir au moins 3 caractères')
      .max(50, 'Le numéro de la pièce d\'identité ne peut pas dépasser 50 caractères')
      .regex(/^[a-zA-Z0-9\s\-\/]+$/, 'Le numéro ne peut contenir que des lettres, chiffres, espaces, tirets et slashs'),
  ),
  // Photo de la pièce d'identité recto
  documentPhotoFront: z.union([
    z.string().startsWith('data:image/', 'Format de photo invalide'),
    z.instanceof(File),
    z.undefined()
  ])
    .refine(
      (value) => {
        if (!value) return false // Photo obligatoire
        if (typeof value === 'string') {
          return value.startsWith('data:image/jpeg') ||
            value.startsWith('data:image/png') ||
            value.startsWith('data:image/webp')
        }
        if (value instanceof File) {
          return value.size <= 5 * 1024 * 1024 && // 5MB
            ['image/jpeg', 'image/png', 'image/webp'].includes(value.type)
        }
        return false
      },
      'La photo recto de la pièce d\'identité est requise (JPEG, PNG ou WebP, max 5MB)'
    ),

  // Photo de la pièce d'identité verso (optionnelle pour certains documents)
  documentPhotoBack: z.union([
    z.string().startsWith('data:image/', 'Format de photo invalide'),
    z.instanceof(File),
    z.undefined()
  ])
    .optional()
    .refine(
      (value) => {
        if (!value) return true // Optionnel
        if (typeof value === 'string') {
          return value.startsWith('data:image/jpeg') ||
            value.startsWith('data:image/png') ||
            value.startsWith('data:image/webp')
        }
        if (value instanceof File) {
          return value.size <= 5 * 1024 * 1024 && // 5MB
            ['image/jpeg', 'image/png', 'image/webp'].includes(value.type)
        }
        return false
      },
      'La photo verso doit être au format JPEG, PNG ou WebP et ne pas dépasser 5MB'
    ),

  // Date d'expiration (obligatoire)
  expirationDate: z.string()
    .min(1, 'La date d\'expiration est requise')
    .refine((date) => {
      const expirationDate = new Date(date)
      const today = new Date()
      return expirationDate > today
    }, 'La date d\'expiration doit être dans le futur'),

  // Lieu de délivrance (obligatoire)
  issuingPlace: z.string()
    .min(2, 'Le lieu de délivrance doit contenir au moins 2 caractères')
    .max(100, 'Le lieu de délivrance ne peut pas dépasser 100 caractères'),

  // Date de délivrance (obligatoire)
  issuingDate: z.string()
    .min(1, 'La date de délivrance est requise')
    .refine((date) => {
      const issuingDate = new Date(date)
      const today = new Date()
      return issuingDate <= today
    }, 'La date de délivrance ne peut pas être dans le futur'),

  // Acceptation des conditions (obligatoire)
  termsAccepted: z.boolean()
    .refine((value) => value === true, 'Vous devez accepter les conditions pour continuer')
}).refine((data) => {
  // Validation croisée : la date d'expiration doit être postérieure à la date de délivrance
  if (data.issuingDate && data.expirationDate) {
    const issuingDate = new Date(data.issuingDate)
    const expirationDate = new Date(data.expirationDate)
    return expirationDate > issuingDate
  }
  return true
}, {
  message: 'La date d\'expiration doit être postérieure à la date de délivrance',
  path: ['expirationDate']
})

// ================== SCHÉMA COMPLET ==================
export const registerSchema = z.object({
  identity: identitySchema,
  address: addressSchema,
  company: companySchema,
  documents: documentsSchema
})

// ================== TYPES INFÉRÉS ==================

// Types pour les énumérations
export type IdentityDocument = z.infer<typeof IdentityDocumentEnum>
export type InsuranceType = z.infer<typeof InsuranceTypeEnum>

// Types pour chaque schéma individuel
export type AddressFormData = z.infer<typeof addressSchema>
export type DocumentsFormData = z.infer<typeof documentsSchema>

// Type pour le schéma complet (importé depuis types.ts pour éviter les conflits de modules)
export type { RegisterFormData } from '../types/types'

// Re-exports des schémas company pour compatibilité
export { companySchema, companyCrudSchema, companyDefaultValues } from './company.schema'
export type { CompanyFormData, CompanyCrudFormData, CompanyAddressData } from './company.schema'


// ================== SCHÉMAS PARTIELS POUR CHAQUE STEP ==================
// Utiles pour la validation étape par étape
export const stepSchemas = {
  1: identitySchema,
  2: addressSchema,
  3: companySchema,
  4: documentsSchema
} as const

// ================== MEMBER LOGIN SCHEMA ==================
export const memberLoginSchema = z.object({
  phoneNumber: z
    .string()
    .min(8, 'Le numéro de téléphone doit contenir au moins 8 chiffres')
    .max(15, 'Le numéro de téléphone ne peut pas dépasser 15 chiffres')
    .regex(/^[+]?[\d\s\-()]+$/, 'Format de numéro de téléphone invalide')
    .transform(val => val.replace(/\s/g, '')) // Supprime les espaces
})

// Type pour les données de connexion membre
export type MemberLoginFormData = z.infer<typeof memberLoginSchema>

// Valeurs par défaut pour le formulaire membre
export const memberLoginDefaultValues: MemberLoginFormData = {
  phoneNumber: ''
}

// ================== MEMBER TWO-STEP LOGIN (Matricule + Téléphone) ==================
export const memberTwoStepLoginSchema = z.object({
  matricule: z
    .string()
    .min(3, 'Le matricule doit contenir au moins 3 caractères'),
  phoneNumber: z
    .string()
    .min(8, 'Le numéro de téléphone doit contenir au moins 8 chiffres')
    .max(15, 'Le numéro de téléphone ne peut pas dépasser 15 chiffres')
    .regex(/^[+]?[\d\s\-()]+$/, 'Format de numéro de téléphone invalide')
    .transform(val => val.replace(/\s/g, '')),
})

export type MemberTwoStepLoginFormData = z.infer<typeof memberTwoStepLoginSchema>

export const memberTwoStepLoginDefaultValues: MemberTwoStepLoginFormData = {
  matricule: '',
  phoneNumber: '+241'
}

// ================== ADMIN LOGIN SCHEMA ==================
export const adminLoginSchema = z.object({
  email: z.string()
    .email('Format d\'email invalide')
    .min(1, 'L\'email est requis'),

  password: z.string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .max(100, 'Le mot de passe ne peut pas dépasser 100 caractères')
})

// Type pour les données de connexion admin
export type AdminLoginFormData = z.infer<typeof adminLoginSchema>

// Valeurs par défaut pour le formulaire admin
export const adminLoginDefaultValues: AdminLoginFormData = {
  email: '',
  password: ''
}

// ================== ADMIN CREATE SCHEMA ==================
export const AdminRoleEnum = z.enum(['SuperAdmin', 'Admin', 'Secretary'])
// ================== JOB (PROFESSION) SCHEMA ==================
export const jobSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  description: z.string().optional(),
})
export type JobFormData = z.infer<typeof jobSchema>



export const adminCreateSchema = z.object({
  civility: CivilityEnum,
  lastName: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets'),
  firstName: z.string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le prénom ne peut contenir que des lettres, espaces, apostrophes et tirets'),
  birthDate: z.string().min(1, 'La date de naissance est requise'),
  gender: GenderEnum,
  email: z.string().email('Format d\'email invalide').optional(),
  contacts: z.array(
    z.string()
      .min(8, 'Le numéro de téléphone doit contenir au moins 8 chiffres')
      .max(15, 'Le numéro de téléphone ne peut pas dépasser 15 chiffres')
      .regex(/^[\+]?[0-9\s\-\(\)]+$/, 'Format de téléphone invalide')
  ).length(1, 'Un seul numéro de téléphone est requis'),
  roles: z.array(AdminRoleEnum).min(1, 'Sélectionnez au moins un rôle'),
  photoURL: z.string().url('URL invalide').nullable().optional(),
  photoPath: z.string().nullable().optional(),
})

export type AdminCreateFormData = z.infer<typeof adminCreateSchema>

// ================== VALEURS PAR DÉFAUT ==================
export const defaultValues = {
  identity: identityDefaultValues,
  address: addressDefaultValues,
  company: companyDefaultValues,
  documents: {
    identityDocument: 'NIP',
    identityDocumentNumber: '',
    documentPhotoFront: undefined as any, // Sera défini lors de l'upload
    documentPhotoBack: undefined,
    expirationDate: '', // Obligatoire
    issuingPlace: '', // Obligatoire
    issuingDate: '' // Obligatoire
  }
}

// ================== EARLY REFUND SCHEMA ==================
// Schema pour le formulaire de marquage comme payé (sans la cause qui est saisie à la création)
export const earlyRefundSchema = z.object({
  withdrawalDate: z.string()
    .min(1, 'La date du retrait est requise')
    .refine((date) => {
      const withdrawalDate = new Date(date)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // Fin de la journée
      return withdrawalDate <= today
    }, 'La date du retrait ne peut pas être dans le futur'),

  withdrawalTime: z.string()
    .min(1, 'L\'heure du retrait est requise')
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format d\'heure invalide (HH:MM)'),

  proof: z.union([
    z.instanceof(File),
    z.undefined()
  ])
    .refine((file) => {
      if (!file) return false
      // Accepter les images et les PDFs
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') return false
      if (file.size > 20 * 1024 * 1024) return false // 20MB max
      return true
    }, 'Une preuve est requise (JPEG, PNG, WebP, PDF, max 20MB)')
})

export type EarlyRefundFormData = z.infer<typeof earlyRefundSchema>

export const earlyRefundDefaultValues: EarlyRefundFormData = {
  withdrawalDate: new Date().toISOString().split('T')[0],
  withdrawalTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  proof: undefined
}

// ================== CONTRACT CREATION SCHEMA ==================

export const contractCreationSchema = z.object({
  // Étape 1: Sélection du type de contrat
  contractType: z.enum(['INDIVIDUAL', 'GROUP']),

  memberId: z.string().optional(),

  groupeId: z.string().optional(),

  // Étape 2: Configuration de la caisse
  caisseType: z.enum(['STANDARD', 'JOURNALIERE', 'LIBRE']),

  monthlyAmount: z.number()
    .min(100, 'Le montant mensuel doit être au moins 100 FCFA')
    .max(1000000, 'Le montant mensuel ne peut pas dépasser 1 000 000 FCFA'),

  monthsPlanned: z.number()
    .min(1, 'La durée doit être d\'au moins 1 mois')
    .max(60, 'La durée ne peut pas dépasser 60 mois'),

  // Étape 3: Planification des versements
  firstPaymentDate: z.string()
    .min(1, 'La date du premier versement est requise')
    .refine((date) => {
      const selectedDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return selectedDate >= today
    }, 'La date du premier versement ne peut pas être dans le passé'),

  // Étape 3: Document PDF du contrat signé
  contractPdf: z.instanceof(File).optional(),

  // Étape 3: Contact d'urgence
  emergencyContact: z.object({
    lastName: z.string()
      .min(1, 'Le nom du contact d\'urgence est obligatoire')
      .max(50, 'Le nom ne peut pas dépasser 50 caractères')
      .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/, 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes'),
    
    firstName: z.string()
      .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
      .regex(/^[a-zA-ZÀ-ÿ\s\-']*$/, 'Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes')
      .optional(),
    
    phone1: z.string()
      .min(1, 'Le numéro de téléphone principal est obligatoire')
      .max(12, 'Le numéro de téléphone ne peut pas dépasser 12 caractères')
      .regex(/^(\+241|241)?(62|65|66|74|77)[0-9]{6}$/, 'Format de téléphone invalide. Les numéros gabonais commencent par +241 62, 65, 66, 74 ou 77 (ex: +241 65 34 56 78)'),
    
    phone2: z.string()
      .max(12, 'Le numéro de téléphone ne peut pas dépasser 12 caractères')
      .regex(/^(\+241|241)?(62|65|66|74|77)[0-9]{6}$/, 'Format de téléphone invalide. Les numéros gabonais commencent par +241 62, 65, 66, 74 ou 77 (ex: +241 65 34 56 78)')
      .optional()
      .or(z.literal('')),
    
    relationship: RelationshipEnum
  }).optional(),

  // Métadonnées
  isValid: z.boolean(),
  currentStep: z.number().min(1).max(3)

}).superRefine((data, ctx) => {
  // Validation croisée pour memberId/groupeId selon le type de contrat
  if (data.contractType === 'INDIVIDUAL') {
    if (!data.memberId || data.memberId.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Veuillez sélectionner un membre pour un contrat individuel',
        path: ['memberId']
      })
    }
    if (data.groupeId && data.groupeId.trim() !== '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Un contrat individuel ne peut pas avoir d\'ID de groupe',
        path: ['groupeId']
      })
    }
  } else if (data.contractType === 'GROUP') {
    if (!data.groupeId || data.groupeId.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Veuillez sélectionner un groupe pour un contrat de groupe',
        path: ['groupeId']
      })
    }
    if (data.memberId && data.memberId.trim() !== '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Un contrat de groupe ne peut pas avoir d\'ID de membre',
        path: ['memberId']
      })
    }
  }

  // Validation spécifique pour le type LIBRE
  if (data.caisseType === 'LIBRE' && data.monthlyAmount < 100000) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Pour un contrat Libre, le montant mensuel doit être au minimum 100 000 FCFA',
      path: ['monthlyAmount']
    })
  }

  // Validation de la durée selon le type de caisse
  if (data.caisseType === 'JOURNALIERE' && data.monthsPlanned > 12) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Pour un contrat Journalier, la durée ne peut pas dépasser 12 mois',
      path: ['monthsPlanned']
    })
  }
})

export type ContractCreationFormData = z.infer<typeof contractCreationSchema>

// Valeurs par défaut pour le formulaire
export const contractCreationDefaultValues: ContractCreationFormData = {
  contractType: 'INDIVIDUAL',
  memberId: '',
  groupeId: '',
  caisseType: 'STANDARD',
  monthlyAmount: 10000,
  monthsPlanned: 12,
  firstPaymentDate: new Date().toISOString().split('T')[0],
  contractPdf: undefined,
  emergencyContact: undefined,
  isValid: false,
  currentStep: 1
}

// Schémas pour chaque étape individuelle
export const step1Schema = z.object({
  contractType: z.enum(['INDIVIDUAL', 'GROUP']),
  memberId: z.string().optional(),
  groupeId: z.string().optional()
})

export const step2Schema = z.object({
  caisseType: z.enum(['STANDARD', 'JOURNALIERE', 'LIBRE']),
  monthlyAmount: z.number().min(100).max(1000000),
  monthsPlanned: z.number().min(1).max(60)
})

export const step3Schema = z.object({
  firstPaymentDate: z.string().min(1)
})

// Types pour chaque étape
export type Step1FormData = z.infer<typeof step1Schema>
export type Step2FormData = z.infer<typeof step2Schema>
export type Step3FormData = z.infer<typeof step3Schema>