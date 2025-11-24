import { z } from 'zod'

const GABON_PHONE_REGEX = /^\+2416\d{7}$/

const normalizePhone = (value?: string | null) => (value || '').replace(/\s+/g, '')
const hasCompletePhone = (value?: string | null) => {
  const normalized = normalizePhone(value)
  return normalized.length > 4 && normalized !== '+241'
}

const optionalGabonPhoneSchema = z
  .string()
  .optional()
  .nullable()
  .refine(value => {
    if (!hasCompletePhone(value)) return true
    return GABON_PHONE_REGEX.test(normalizePhone(value))
  }, {
    message: 'Format attendu: +241 6X XX XX XX',
  })

export const vehicleInsuranceFormSchema = z.object({
  // Type de titulaire
  holderType: z.enum(['member', 'non-member']),
  city: z.string().min(1, 'La ville est requise'),
  
  // Champs pour membre (conditionnel)
  memberId: z.string().optional(),
  memberFirstName: z.string().optional(),
  memberLastName: z.string().optional(),
  memberMatricule: z.string().optional(),
  memberContacts: z.array(z.string()).optional(),
  
  // Champs pour non-membre (conditionnel)
  nonMemberFirstName: z.string().optional(),
  nonMemberLastName: z.string().optional(),
  nonMemberPhone1: optionalGabonPhoneSchema,
  nonMemberPhone2: optionalGabonPhoneSchema,
  
  sponsorMemberId: z.string().min(1, 'Parrain requis'),
  sponsorName: z.string().min(1, 'Parrain requis'),
  sponsorMatricule: z.string().optional().nullable(),
  sponsorContacts: z.array(z.string()).optional(),
  vehicleType: z.enum(['car', 'motorcycle', 'truck', 'bus', 'maison', 'other']),
  vehicleBrand: z.string().min(1, 'La marque est requise'),
  vehicleModel: z.string().min(1, 'Le modèle est requis'),
  energySource: z.enum(['essence', 'diesel', 'electrique', 'hybride', 'gaz', 'autre']),
  fiscalPower: z.string().min(1, 'La puissance fiscale est requise'),
  vehicleYear: z
    .coerce.number({ message: "L'année doit être un nombre" })
    .int('Année invalide')
    .min(1960, 'Année trop ancienne')
    .max(new Date().getFullYear() + 1, 'Année future invalide')
    .optional()
    .nullable(),
  plateNumber: z
    .string()
    .min(3, 'Plaque invalide')
    .regex(/[A-Za-z0-9-]+/, 'Format de plaque invalide'),
  insuranceCompany: z.string().min(1, "Le nom de l'assurance est requis"),
  policyNumber: z.string().min(3, 'Numéro de police requis'),
  warrantyMonths: z
    .coerce.number({ message: 'Durée invalide' })
    .int('La durée doit être un nombre entier')
    .min(1, 'Au moins 1 mois')
    .max(60, 'Durée maximale 60 mois'),
  premiumAmount: z
    .coerce.number({ message: 'Montant invalide' })
    .nonnegative('Montant positif requis'),
  currency: z.string().min(1, 'La devise est requise').default('FCFA'),
  startDate: z.coerce.date({ message: 'Date de début requise' }),
  endDate: z.coerce.date({ message: "Date de fin requise" }),
  notes: z.string().max(1000, '1000 caractères max').optional().nullable(),
  attachments: z
    .object({
      policyUrl: z.string().url().optional().nullable(),
      policyPath: z.string().optional().nullable(),
      receiptUrl: z.string().url().optional().nullable(),
      receiptPath: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
})
.refine(data => data.endDate > data.startDate, {
  message: "La date de fin doit être postérieure à la date de début",
  path: ['endDate'],
})
.superRefine((data, ctx) => {
  if (data.holderType === 'member') {
    if (!data.memberId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Sélectionnez un membre KARA',
        path: ['memberId'],
      })
    }
  } else {
    if (!data.nonMemberFirstName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Le prénom est requis',
        path: ['nonMemberFirstName'],
      })
    }
    if (!data.nonMemberLastName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Le nom est requis',
        path: ['nonMemberLastName'],
      })
    }
    if (!hasCompletePhone(data.nonMemberPhone1) || !GABON_PHONE_REGEX.test(normalizePhone(data.nonMemberPhone1))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Téléphone au format gabonais requis',
        path: ['nonMemberPhone1'],
      })
    }
  }

  if (hasCompletePhone(data.nonMemberPhone2) && !GABON_PHONE_REGEX.test(normalizePhone(data.nonMemberPhone2))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Téléphone au format gabonais requis',
      path: ['nonMemberPhone2'],
    })
  }
})

export type VehicleInsuranceFormValues = z.infer<typeof vehicleInsuranceFormSchema>

export const vehicleInsuranceFiltersSchema = z.object({
  status: z.enum(['all', 'active', 'expires_soon', 'expired']).default('all'),
  insuranceCompany: z.string().optional(),
  vehicleType: z.enum(['all', 'car', 'motorcycle', 'truck', 'bus', 'other']).default('all'),
  searchQuery: z.string().optional(),
  sponsorMemberId: z.string().optional(),
  alphabeticalOrder: z.enum(['asc', 'desc']).default('asc'),
})

export type VehicleInsuranceFiltersFormValues = z.infer<typeof vehicleInsuranceFiltersSchema>

