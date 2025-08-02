import { z } from 'zod'

// Énumérations pour les options fixes (valeurs en français)
export const CivilityEnum = z.enum(['Monsieur', 'Madame', 'Mademoiselle'])

export const GenderEnum = z.enum(['Homme', 'Femme'])

export const IdentityDocumentEnum = z.enum([
  'Passeport',
  'Carte de séjour',
  'Carte scolaire',
  'Carte consulaire',
  'NIP',
  'CNI',
  'Autre'
])

export const MaritalStatusEnum = z.enum([
  'Célibataire',
  'En couple',
  'Marié(e)',
  'Veuf/Veuve',
  'Divorcé(e)',
  'Concubinage',
  'Pacsé(e)',
  'Séparé(e)'
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

// ================== STEP 1: IDENTITÉ ==================
export const identitySchema = z.object({
  civility: CivilityEnum,
  
  lastName: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets'),
  
  firstName: z.string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le prénom ne peut contenir que des lettres, espaces, apostrophes et tirets'),
  
  birthDate: z.string()
    .min(1, 'La date de naissance est requise')
    .refine((date) => {
      const birthDate = new Date(date)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      return age >= 18 && age <= 120
    }, 'Vous devez avoir au moins 18 ans'),
  
  birthPlace: z.string()
    .min(2, 'Le lieu de naissance doit contenir au moins 2 caractères')
    .max(100, 'Le lieu de naissance ne peut pas dépasser 100 caractères'),
  
  birthCertificateNumber: z.string()
    .min(1, 'Le numéro d\'acte de naissance est requis')
    .max(50, 'Le numéro d\'acte de naissance ne peut pas dépasser 50 caractères'),
  
  prayerPlace: z.string()
    .min(2, 'Le lieu de prière doit contenir au moins 2 caractères')
    .max(100, 'Le lieu de prière ne peut pas dépasser 100 caractères'),
  
  contacts: z.array(
    z.string()
      .min(8, 'Le numéro de téléphone doit contenir au moins 8 chiffres')
      .max(15, 'Le numéro de téléphone ne peut pas dépasser 15 chiffres')
      .regex(/^[\+]?[0-9\s\-\(\)]+$/, 'Format de téléphone invalide')
  )
    .min(1, 'Au moins un numéro de téléphone est requis')
    .max(2, 'Maximum 2 numéros de téléphone')
    .refine((contacts) => {
      const uniqueContacts = new Set(contacts)
      return uniqueContacts.size === contacts.length
    }, 'Les numéros de téléphone doivent être uniques'),
  
  email: z.string()
    .email('Format d\'email invalide')
    .max(100, 'L\'email ne peut pas dépasser 100 caractères')
    .optional(),
  
  gender: GenderEnum,
  
  nationality: z.string()
    .min(2, 'La nationalité doit contenir au moins 2 caractères')
    .max(50, 'La nationalité ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'La nationalité ne peut contenir que des lettres, espaces, apostrophes et tirets'),
  
  maritalStatus: MaritalStatusEnum,
  
  // Champs pour le conjoint (requis si marié, en couple, en concubinage ou pacsé)
  spouseLastName: z.string()
    .optional()
    .refine((value) => {
      // Si pas de valeur ou valeur vide, c'est valide (sera géré par la validation conditionnelle)
      if (!value || value.trim() === '') return true
      // Si une valeur est fournie, elle doit respecter les règles
      return value.length >= 2 && value.length <= 50 && /^[a-zA-ZÀ-ÿ\s'-]+$/.test(value)
    }, 'Le nom du conjoint doit contenir entre 2 et 50 caractères et uniquement des lettres, espaces, apostrophes et tirets'),
  
  spouseFirstName: z.string()
    .optional()
    .refine((value) => {
      // Si pas de valeur ou valeur vide, c'est valide (sera géré par la validation conditionnelle)
      if (!value || value.trim() === '') return true
      // Si une valeur est fournie, elle doit respecter les règles
      return value.length >= 2 && value.length <= 50 && /^[a-zA-ZÀ-ÿ\s'-]+$/.test(value)
    }, 'Le prénom du conjoint doit contenir entre 2 et 50 caractères et uniquement des lettres, espaces, apostrophes et tirets'),
  
  spousePhone: z.string()
    .optional()
    .refine((value) => {
      // Si pas de valeur ou valeur vide, c'est valide (sera géré par la validation conditionnelle)
      if (!value || value.trim() === '') return true
      // Si une valeur est fournie, elle doit respecter les règles
      return value.length >= 8 && value.length <= 15 && /^[\+]?[0-9\s\-\(\)]+$/.test(value)
    }, 'Le numéro du conjoint doit contenir entre 8 et 15 chiffres et respecter le format téléphonique'),
  
  intermediaryCode: z.string()
    .max(50, 'Le code entremetteur ne peut pas dépasser 50 caractères')
    .optional(),
  
  // Nouvelle question simple pour la voiture
  hasCar: z.boolean().default(false),
  
  photo: z.union([
    z.string().startsWith('data:image/', 'Format de photo invalide'),
    z.instanceof(File),
    z.undefined()
  ])
    .optional()
    .refine(
      (value) => {
        if (!value) return true
        if (typeof value === 'string') {
          // Pour les data URLs, on ne peut pas vérifier la taille facilement
          // mais on peut vérifier le format
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
      'La photo doit être au format JPEG, PNG ou WebP et ne pas dépasser 5MB'
    )
}).refine((data) => {
  // Si la situation matrimoniale indique un conjoint, les champs du conjoint deviennent obligatoires
  const marriedStatuses = ['En couple', 'Marié(e)', 'Concubinage', 'Pacsé(e)']
  
  if (marriedStatuses.includes(data.maritalStatus)) {
    // Pour les situations avec conjoint, vérifier que les champs sont remplis
    const hasSpouseLastName = data.spouseLastName && data.spouseLastName.trim().length >= 2
    const hasSpouseFirstName = data.spouseFirstName && data.spouseFirstName.trim().length >= 2
    const hasSpousePhone = data.spousePhone && data.spousePhone.trim().length >= 8
    
    return hasSpouseLastName && hasSpouseFirstName && hasSpousePhone
  } else {
    // Pour les situations sans conjoint, les champs du conjoint ne doivent pas bloquer la validation
    // même s'ils contiennent des données (on les ignore)
    return true
  }
}, {
  message: 'Les informations du conjoint sont requises pour votre situation matrimoniale',
  path: ['spouseLastName']
})

// ================== STEP 2: ADRESSE ==================
export const addressSchema = z.object({
  province: z.string()
    .min(2, 'La province doit contenir au moins 2 caractères')
    .max(50, 'La province ne peut pas dépasser 50 caractères'),
  
  city: z.string()
    .min(2, 'La ville doit contenir au moins 2 caractères')
    .max(50, 'La ville ne peut pas dépasser 50 caractères'),
  
  district: z.string()
    .min(2, 'Le quartier doit contenir au moins 2 caractères')
    .max(100, 'Le quartier ne peut pas dépasser 100 caractères'),
  
  arrondissement: z.string()
    .min(2, 'L\'arrondissement doit contenir au moins 2 caractères')
    .max(50, 'L\'arrondissement ne peut pas dépasser 50 caractères'),
  
  additionalInfo: z.string()
    .max(200, 'Les informations complémentaires ne peuvent pas dépasser 200 caractères')
    .optional()
})

// ================== STEP 3: ENTREPRISE (Optionnel) ==================
export const companySchema = z.object({
  // Champ pour indiquer si l'utilisateur travaille
  isEmployed: z.boolean().default(false),
  
  // Les champs suivants ne sont requis que si isEmployed = true
  companyName: z.string().optional(),
  
  companyAddress: z.object({
    province: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional()
  }).optional(),
  
  profession: z.string().optional(),
  
  seniority: z.string().optional()
}).refine((data) => {
  // Si la personne travaille, tous les champs deviennent obligatoires
  if (data.isEmployed) {
    // Vérifier que tous les champs sont remplis
    const hasCompanyName = data.companyName && data.companyName.length >= 2 && data.companyName.length <= 100
    const hasCompanyAddress = data.companyAddress && 
      data.companyAddress.province && data.companyAddress.province.length >= 2 && data.companyAddress.province.length <= 50 &&
      data.companyAddress.city && data.companyAddress.city.length >= 2 && data.companyAddress.city.length <= 50 &&
      data.companyAddress.district && data.companyAddress.district.length >= 2 && data.companyAddress.district.length <= 100
    const hasProfession = data.profession && data.profession.length >= 2 && data.profession.length <= 100
    const hasSeniority = data.seniority && data.seniority.match(/^\d+\s*(mois|années?|ans?)$/)
    
    return hasCompanyName && hasCompanyAddress && hasProfession && hasSeniority
  }
  return true
}, {
  message: 'Tous les champs entreprise sont requis si vous travaillez',
  path: ['companyName']
}).refine((data) => {
  // Validation des formats si les champs sont remplis (même si isEmployed = false)
  if (data.companyName && data.companyName.length > 0) {
    if (data.companyName.length < 2 || data.companyName.length > 100) {
      return false
    }
  }
  return true
}, {
  message: 'Le nom de l\'entreprise doit contenir entre 2 et 100 caractères',
  path: ['companyName']
}).refine((data) => {
  if (data.companyAddress?.province && data.companyAddress.province.length > 0) {
    if (data.companyAddress.province.length < 2 || data.companyAddress.province.length > 50) {
      return false
    }
  }
  return true
}, {
  message: 'La province doit contenir entre 2 et 50 caractères',
  path: ['companyAddress', 'province']
}).refine((data) => {
  if (data.companyAddress?.city && data.companyAddress.city.length > 0) {
    if (data.companyAddress.city.length < 2 || data.companyAddress.city.length > 50) {
      return false
    }
  }
  return true
}, {
  message: 'La ville doit contenir entre 2 et 50 caractères',
  path: ['companyAddress', 'city']
}).refine((data) => {
  if (data.companyAddress?.district && data.companyAddress.district.length > 0) {
    if (data.companyAddress.district.length < 2 || data.companyAddress.district.length > 100) {
      return false
    }
  }
  return true
}, {
  message: 'Le quartier doit contenir entre 2 et 100 caractères',
  path: ['companyAddress', 'district']
}).refine((data) => {
  if (data.profession && data.profession.length > 0) {
    if (data.profession.length < 2 || data.profession.length > 100) {
      return false
    }
  }
  return true
}, {
  message: 'La profession doit contenir entre 2 et 100 caractères',
  path: ['profession']
}).refine((data) => {
  if (data.seniority && data.seniority.length > 0) {
    if (!data.seniority.match(/^\d+\s*(mois|années?|ans?)$/)) {
      return false
    }
  }
  return true
}, {
  message: 'L\'ancienneté doit être au format "2 ans" ou "6 mois"',
  path: ['seniority']
})

// ================== STEP 4: PIÈCES D'IDENTITÉ ==================
export const documentsSchema = z.object({
  identityDocument: IdentityDocumentEnum,
  
  identityDocumentNumber: z.string()
    .min(3, 'Le numéro de la pièce d\'identité doit contenir au moins 3 caractères')
    .max(50, 'Le numéro de la pièce d\'identité ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-Z0-9\s\-\/]+$/, 'Le numéro ne peut contenir que des lettres, chiffres, espaces, tirets et slashs'),
  
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
    }, 'La date de délivrance ne peut pas être dans le futur')
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
export type Civility = z.infer<typeof CivilityEnum>
export type Gender = z.infer<typeof GenderEnum>
export type IdentityDocument = z.infer<typeof IdentityDocumentEnum>
export type MaritalStatus = z.infer<typeof MaritalStatusEnum>
export type InsuranceType = z.infer<typeof InsuranceTypeEnum>

// Types pour chaque schéma individuel
export type IdentityFormData = z.infer<typeof identitySchema>
export type AddressFormData = z.infer<typeof addressSchema>
export type CompanyFormData = z.infer<typeof companySchema>
export type DocumentsFormData = z.infer<typeof documentsSchema>

// Type pour le schéma complet (importé depuis types.ts pour éviter les conflits de modules)
export type { RegisterFormData } from './types'

// Types pour les sous-objets complexes
export type CompanyAddressData = z.infer<typeof companySchema>['companyAddress']

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

// ================== VALEURS PAR DÉFAUT ==================
export const defaultValues = {
  identity: {
    civility: 'Monsieur',
    lastName: '',
    firstName: '',
    birthDate: '',
    birthPlace: '',
    birthCertificateNumber: '',
    prayerPlace: '',
    contacts: [''],
    email: '',
    gender: 'Homme',
    nationality: '',
    maritalStatus: 'Célibataire',
    spouseLastName: '',
    spouseFirstName: '',
    spousePhone: '',
    intermediaryCode: '',
    hasCar: false,
    photo: undefined
  },
  address: {
    province: '',
    city: '',
    district: '',
    arrondissement: '',
    additionalInfo: ''
  },
  company: {
    isEmployed: false,
    companyName: '',
    companyAddress: {
      province: '',
      city: '',
      district: ''
    },
    profession: '',
    seniority: ''
  },
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