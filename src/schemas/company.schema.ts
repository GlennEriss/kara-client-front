import { z } from 'zod'

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
    ),
    // IDs pour la sélection depuis la base de données (optionnels)
    provinceId: z.string().optional(),
    communeId: z.string().optional(),
    districtId: z.string().optional(),
    quarterId: z.string().optional()
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
    if (!data.seniority || data.seniority.trim().length < 1 || data.seniority.trim().length > 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'L\'ancienneté est requise et doit contenir entre 1 et 50 caractères',
        path: ['seniority']
      })
    }
  }
  
  // Validation optionnelle : si des champs sont remplis, ils doivent être valides
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
    if (data.seniority.trim().length < 1 || data.seniority.trim().length > 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'L\'ancienneté doit contenir entre 1 et 50 caractères',
        path: ['seniority']
      })
    }
  }
})

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

// ================== TYPES INFÉRÉS ==================
export type CompanyFormData = z.infer<typeof companySchema>
export type CompanyCrudFormData = z.infer<typeof companyCrudSchema>
export type CompanyAddressData = z.infer<typeof companySchema>['companyAddress']

// ================== VALEURS PAR DÉFAUT ==================
export const companyDefaultValues: CompanyFormData = {
  isEmployed: false,
  companyName: '',
  companyAddress: {
    province: '',
    city: '',
    district: '',
    provinceId: '',
    communeId: '',
    districtId: '',
    quarterId: ''
  },
  profession: '',
  seniority: ''
}
