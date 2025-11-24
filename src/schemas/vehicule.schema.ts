import { z } from 'zod'

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
  nonMemberPhone1: z.string().optional(),
  nonMemberPhone2: z.string().optional().nullable(),
  
  sponsorMemberId: z.string().optional().nullable(),
  sponsorName: z.string().optional().nullable(),
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
.refine(data => {
  // Validation : si membre, memberId requis
  if (data.holderType === 'member') {
    return !!data.memberId && !!data.memberFirstName && !!data.memberLastName
  }
  // Si non-membre, nom, prénom et téléphone 1 requis
  if (data.holderType === 'non-member') {
    return !!(data.nonMemberFirstName && data.nonMemberLastName && data.nonMemberPhone1)
  }
  return true
}, {
  message: "Les champs requis selon le type de titulaire doivent être remplis",
  path: ['holderType'],
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

