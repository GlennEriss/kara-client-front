import { z } from 'zod'

// Schéma pour Step 1 : Sélection du membre
export const caisseImprevueStep1Schema = z.object({
  memberId: z.string().min(1, 'Le membre est requis'),
  memberFirstName: z.string().min(1, 'Le prénom est requis'),
  memberLastName: z.string().min(1, 'Le nom est requis'),
  memberContacts: z.array(z.string()).min(1, 'Au moins un contact est requis'),
  memberEmail: z.string().email('Email invalide').optional().or(z.literal('')),
})

// Schéma pour Step 2 : Forfait et type de remboursement
export const caisseImprevueStep2Schema = z.object({
  // Code du forfait sélectionné (A à E)
  planCode: z.enum(['A', 'B', 'C', 'D', 'E'], {
    message: 'Le forfait est requis',
  }),
  // Fréquence de paiement: quotidien (au fil des jours) ou mensuel (une fois par mois)
  paymentFrequency: z.enum(['DAILY', 'MONTHLY'], {
    message: 'Le type de paiement est requis',
  }),
})

// Schéma pour Step 3 : Contact d'urgence
export const caisseImprevueStep3Schema = z.object({
  emergencyContactName: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  emergencyContactRelationship: z
    .string()
    .min(2, 'La relation doit contenir au moins 2 caractères')
    .max(50, 'La relation ne peut pas dépasser 50 caractères'),
  emergencyContactPhone: z
    .string()
    .regex(
      /^(\+241|241)?(62|65|66|74|77)[0-9]{6}$/,
      'Numéro invalide. Format: +241 XX XX XX XX (Libertis: 62/66, Moov: 65, Airtel: 74/77)'
    ),
  emergencyContactEmail: z
    .string()
    .email('Email invalide')
    .optional()
    .or(z.literal('')),
  emergencyContactAddress: z.string().optional(),
})

// Schéma global combinant les 3 étapes
export const caisseImprevueGlobalSchema = z.object({
  step1: caisseImprevueStep1Schema,
  step2: caisseImprevueStep2Schema,
  step3: caisseImprevueStep3Schema,
})

// Types TypeScript dérivés des schémas
export type CaisseImprevueStep1FormData = z.infer<typeof caisseImprevueStep1Schema>
export type CaisseImprevueStep2FormData = z.infer<typeof caisseImprevueStep2Schema>
export type CaisseImprevueStep3FormData = z.infer<typeof caisseImprevueStep3Schema>
export type CaisseImprevueGlobalFormData = z.infer<typeof caisseImprevueGlobalSchema>

// Valeurs par défaut pour chaque étape
export const defaultCaisseImprevueStep1Values: Partial<CaisseImprevueStep1FormData> = {
  memberId: '',
  memberFirstName: '',
  memberLastName: '',
  memberContacts: [],
  memberEmail: '',
}

export const defaultCaisseImprevueStep2Values: Partial<CaisseImprevueStep2FormData> = {
  planCode: 'A',
  paymentFrequency: 'MONTHLY',
}

export const defaultCaisseImprevueStep3Values: Partial<CaisseImprevueStep3FormData> = {
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
  emergencyContactEmail: '',
  emergencyContactAddress: '',
}

export const defaultCaisseImprevueGlobalValues: Partial<CaisseImprevueGlobalFormData> = {
  step1: defaultCaisseImprevueStep1Values as CaisseImprevueStep1FormData,
  step2: defaultCaisseImprevueStep2Values as CaisseImprevueStep2FormData,
  step3: defaultCaisseImprevueStep3Values as CaisseImprevueStep3FormData,
}

// ========== SCHÉMA POUR LA GESTION DES FORFAITS (SUBSCRIPTIONCI) ==========

// Schéma pour la création/modification d'un forfait
export const subscriptionCISchema = z.object({
  // Label/nom descriptif du forfait (optionnel)
  label: z.string().optional().or(z.literal('')),

  // Code du forfait (A à E ou personnalisé)
  code: z.string().min(1, 'Le code du forfait est requis'),

  // Montant mensuel à cotiser (en FCFA)
  amountPerMonth: z
    .number({
      message: 'Le montant mensuel est requis',
    })
    .positive('Le montant doit être positif')
    .int('Le montant doit être un nombre entier'),

  // Somme nominale à atteindre en 12 mois (en FCFA)
  nominal: z
    .number({
      message: 'Le nominal est requis',
    })
    .positive('Le nominal doit être positif')
    .int('Le nominal doit être un nombre entier'),

  // Durée du contrat en mois
  durationInMonths: z
    .number({
      message: 'La durée est requise',
    })
    .int('La durée doit être un nombre entier')
    .positive('La durée doit être positive')
    .max(24, 'La durée ne peut pas dépasser 24 mois'),

  // Taux de pénalité en pourcentage
  penaltyRate: z
    .number({
      message: 'Le taux de pénalité est requis',
    })
    .min(0, 'Le taux de pénalité ne peut pas être négatif')
    .max(100, 'Le taux de pénalité ne peut pas dépasser 100%'),

  // Nombre de jours de délai avant application des pénalités
  penaltyDelayDays: z
    .number({
      message: 'Le délai de pénalité est requis',
    })
    .int('Le délai doit être un nombre entier')
    .min(0, 'Le délai ne peut pas être négatif')
    .max(30, 'Le délai ne peut pas dépasser 30 jours'),

  // Montant minimum d'appui (en FCFA)
  supportMin: z
    .number({
      message: 'Le montant minimum d\'appui est requis',
    })
    .min(0, 'Le montant minimum ne peut pas être négatif')
    .int('Le montant doit être un nombre entier'),

  // Montant maximum d'appui (en FCFA)
  supportMax: z
    .number({
      message: 'Le montant maximum d\'appui est requis',
    })
    .positive('Le montant maximum doit être positif')
    .int('Le montant doit être un nombre entier'),

  // Statut du forfait (ACTIVE ou INACTIVE)
  status: z.enum(['ACTIVE', 'INACTIVE'], {
    message: 'Le statut est requis',
  }),
}).refine(
  (data) => data.supportMax >= data.supportMin,
  {
    message: 'Le montant maximum d\'appui doit être supérieur ou égal au montant minimum',
    path: ['supportMax'],
  }
)

// Type dérivé du schéma
export type SubscriptionCIFormData = z.infer<typeof subscriptionCISchema>

// Valeurs par défaut pour un nouveau forfait
export const defaultSubscriptionCIValues: Partial<SubscriptionCIFormData> = {
  label: '',
  code: 'A',
  amountPerMonth: 10000,
  nominal: 120000,
  durationInMonths: 12,
  penaltyRate: 0,
  penaltyDelayDays: 3,
  supportMin: 500,
  supportMax: 30000,
  status: 'ACTIVE',
}

