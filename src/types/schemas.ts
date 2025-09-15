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
  'Veuf/Veuve',
  'Marié(e)',
  'Concubinage'
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
  
  lastName: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string()
      .min(2, 'Le nom doit contenir au moins 2 caractères')
      .max(50, 'Le nom ne peut pas dépasser 50 caractères')
      .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets')
  ),
  
  firstName: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string()
      .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
  ).optional().superRefine((value, ctx) => {
    // Si pas de valeur ou valeur vide, c'est valide
    if (!value || value.trim() === '') return
    
    const trimmedValue = value.trim()
    
    // Vérifier la longueur minimale
    if (trimmedValue.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Le prénom doit contenir au moins 2 caractères',
        path: ['firstName']
      })
      return
    }
    
    // Vérifier le format
    if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(trimmedValue)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Le prénom ne peut contenir que des lettres, espaces, apostrophes et tirets',
        path: ['firstName']
      })
    }
  }),
  
  birthDate: z.string()
    .min(1, 'La date de naissance est requise')
    .refine((date) => {
      const birthDate = new Date(date)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      return age >= 18 && age <= 120
    }, 'Vous devez avoir au moins 18 ans'),
  
  birthPlace: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string()
      .min(2, 'Le lieu de naissance doit contenir au moins 2 caractères')
      .max(100, 'Le lieu de naissance ne peut pas dépasser 100 caractères')
  ),
  
  birthCertificateNumber: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string()
      .min(1, 'Le numéro d\'acte de naissance est requis')
      .max(50, 'Le numéro d\'acte de naissance ne peut pas dépasser 50 caractères')
  ),
  
  prayerPlace: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string()
      .min(2, 'Le lieu de prière doit contenir au moins 2 caractères')
      .max(100, 'Le lieu de prière ne peut pas dépasser 100 caractères')
  ),
  
  religion: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string()
      .min(1, 'La religion est requise')
      .max(50, 'La religion ne peut pas dépasser 50 caractères')
  ),
  
  contacts: z.preprocess(
    (val) => {
      if (typeof val === 'string') return [val]
      return val
    },
    z.array(z.string().optional())
    .max(2, 'Maximum 2 numéros de téléphone')
    .superRefine((contacts: Array<string | undefined>, ctx) => {
      let numValid = 0
      const seen = new Set<string>()
      contacts.forEach((value, index) => {
        const str = typeof value === 'string' ? value : ''
        const trimmed = str.trim()
        if (trimmed === '') {
          // Ignorer les champs vides (gérés par l'UI)
          return
        }
        const digits = trimmed.replace(/\D/g, '')
        if (digits.length < 8) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index],
            message: 'Le numéro de téléphone doit contenir au moins 8 chiffres'
          })
          return
        }
        if (digits.length > 15) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index],
            message: 'Le numéro de téléphone ne peut pas dépasser 15 chiffres'
          })
          return
        }
        numValid += 1
        if (seen.has(digits)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index],
            message: 'Les numéros de téléphone doivent être uniques'
          })
        } else {
          seen.add(digits)
        }
      })
      if (numValid === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [],
          message: 'Au moins un numéro de téléphone valide est requis'
        })
      }
    })),
  
  email: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string()
      .email('Format d\'email invalide')
      .max(100, 'L\'email ne peut pas dépasser 100 caractères')
      .optional()
  ),
  
  gender: GenderEnum,
  
  nationality: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string()
      .min(2, 'La nationalité doit contenir au moins 2 caractères')
      .max(50, 'La nationalité ne peut pas dépasser 50 caractères')
      .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'La nationalité ne peut contenir que des lettres, espaces, apostrophes et tirets')
  ),
  
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
    z.instanceof(File)
  ])
    .refine(
      (value: any) => {
        if (!value) return false // Photo obligatoire
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
      'Une photo de profil est requise au format JPEG, PNG ou WebP (max 5MB)'
    )
}).refine((data) => {
  // Si la situation matrimoniale indique un conjoint, les champs du conjoint deviennent obligatoires
  const marriedStatuses = ['Marié(e)', 'Concubinage']
  
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
  province: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string()
      .min(2, 'La province doit contenir au moins 2 caractères')
      .max(50, 'La province ne peut pas dépasser 50 caractères')
  ),
  
  city: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string()
      .min(2, 'La ville doit contenir au moins 2 caractères')
      .max(50, 'La ville ne peut pas dépasser 50 caractères')
  ),
  
  district: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string()
      .min(2, 'Le quartier doit contenir au moins 2 caractères')
      .max(100, 'Le quartier ne peut pas dépasser 100 caractères')
  ),
  
  arrondissement: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string()
      .min(2, 'L\'arrondissement doit contenir au moins 2 caractères')
      .max(50, 'L\'arrondissement ne peut pas dépasser 50 caractères')
  ),
  
  additionalInfo: z.string()
    .max(200, 'Les informations complémentaires ne peuvent pas dépasser 200 caractères')
    .optional()
})

// ================== STEP 3: ENTREPRISE (Optionnel) ==================
export const companySchema = z.object({
  // Champ pour indiquer si l'utilisateur travaille
  isEmployed: z.boolean().default(false),
  
  // Les champs suivants ne sont requis que si isEmployed = true
  companyName: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().optional()
  ),
  
  companyAddress: z.object({
    province: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim() : val),
      z.string().optional()
    ),
    city: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim() : val),
      z.string().optional()
    ),
    district: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim() : val),
      z.string().optional()
    )
  }).optional(),
  
  profession: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().optional()
  ),
  
  seniority: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().optional()
  )
}).superRefine((data, ctx) => {
  // Si la personne travaille, tous les champs deviennent obligatoires
  if (data.isEmployed) {
    // Vérifier le nom de l'entreprise
    if (!data.companyName || data.companyName.trim().length < 2 || data.companyName.trim().length > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Le nom de l\'entreprise est requis et doit contenir entre 2 et 100 caractères',
        path: ['companyName']
      })
    }
    
    // Vérifier l'adresse de l'entreprise
    if (!data.companyAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'L\'adresse de l\'entreprise est requise',
        path: ['companyAddress']
      })
    } else {
      if (!data.companyAddress.province || data.companyAddress.province.trim().length < 2 || data.companyAddress.province.trim().length > 50) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La province est requise et doit contenir entre 2 et 50 caractères',
          path: ['companyAddress', 'province']
        })
      }
      
      if (!data.companyAddress.city || data.companyAddress.city.trim().length < 2 || data.companyAddress.city.trim().length > 50) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La ville est requise et doit contenir entre 2 et 50 caractères',
          path: ['companyAddress', 'city']
        })
      }
      
      if (!data.companyAddress.district || data.companyAddress.district.trim().length < 2 || data.companyAddress.district.trim().length > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Le quartier est requis et doit contenir entre 2 et 100 caractères',
          path: ['companyAddress', 'district']
        })
      }
    }
    
    // Vérifier la profession
    if (!data.profession || data.profession.trim().length < 2 || data.profession.trim().length > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La profession est requise et doit contenir entre 2 et 100 caractères',
        path: ['profession']
      })
    }
    
    // Vérifier l'ancienneté
    if (!data.seniority || !data.seniority.trim().match(/^\d+\s*(mois|années?|ans?)$/)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'L\'ancienneté est requise au format "2 ans" ou "6 mois"',
        path: ['seniority']
      })
    }
  }
  
  // Validation des formats si les champs sont remplis (même si isEmployed = false)
  if (data.companyName && data.companyName.trim().length > 0) {
    if (data.companyName.trim().length < 2 || data.companyName.trim().length > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
  message: 'Le nom de l\'entreprise doit contenir entre 2 et 100 caractères',
  path: ['companyName']
      })
    }
  }
  
  if (data.companyAddress?.province && data.companyAddress.province.trim().length > 0) {
    if (data.companyAddress.province.trim().length < 2 || data.companyAddress.province.trim().length > 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
  message: 'La province doit contenir entre 2 et 50 caractères',
  path: ['companyAddress', 'province']
      })
    }
  }
  
  if (data.companyAddress?.city && data.companyAddress.city.trim().length > 0) {
    if (data.companyAddress.city.trim().length < 2 || data.companyAddress.city.trim().length > 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
  message: 'La ville doit contenir entre 2 et 50 caractères',
  path: ['companyAddress', 'city']
      })
    }
  }
  
  if (data.companyAddress?.district && data.companyAddress.district.trim().length > 0) {
    if (data.companyAddress.district.trim().length < 2 || data.companyAddress.district.trim().length > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
  message: 'Le quartier doit contenir entre 2 et 100 caractères',
  path: ['companyAddress', 'district']
      })
    }
  }
  
  if (data.profession && data.profession.trim().length > 0) {
    if (data.profession.trim().length < 2 || data.profession.trim().length > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
  message: 'La profession doit contenir entre 2 et 100 caractères',
  path: ['profession']
      })
    }
  }
  
  if (data.seniority && data.seniority.trim().length > 0) {
    if (!data.seniority.trim().match(/^\d+\s*(mois|années?|ans?)$/)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
  message: 'L\'ancienneté doit être au format "2 ans" ou "6 mois"',
  path: ['seniority']
      })
    }
  }
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

// ================== COMPANY CRUD SCHEMA (admin -> companies) ==================
export const companyCrudSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(120),
  industry: z.string().optional(),
  address: z.object({
    province: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
  }).optional(),
})
export type CompanyCrudFormData = z.infer<typeof companyCrudSchema>


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
  identity: {
    civility: 'Monsieur',
    lastName: '',
    firstName: '',
    birthDate: '',
    birthPlace: '',
    birthCertificateNumber: '',
    prayerPlace: '',
    religion: '',
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

// ================== EARLY REFUND SCHEMA ==================
export const earlyRefundSchema = z.object({
  reason: z.string()
    .min(10, 'La cause du retrait doit contenir au moins 10 caractères')
    .max(500, 'La cause du retrait ne peut pas dépasser 500 caractères'),
  
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
      if (!file.type.startsWith('image/')) return false
      if (file.size > 5 * 1024 * 1024) return false // 5MB max
      return true
    }, 'Une preuve image est requise (JPEG, PNG, WebP, max 5MB)')
})

export type EarlyRefundFormData = z.infer<typeof earlyRefundSchema>

export const earlyRefundDefaultValues: EarlyRefundFormData = {
  reason: '',
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
  contractPdf: undefined
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