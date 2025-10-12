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
  forfaitType: z.enum(['HOSPITALISATION', 'DECES', 'INVALIDITE', 'AUTRE'], {
    message: 'Le type de forfait est requis',
  }),
  forfaitAmount: z
    .number({
      message: 'Le montant du forfait est requis',
    })
    .positive('Le montant doit être positif'),
  remboursementType: z.enum(['JOURNALIER', 'MENSUEL'], {
    message: 'Le type de remboursement est requis',
  }),
  remboursementDuration: z
    .number({
      message: 'La durée de remboursement est requise',
    })
    .int('La durée doit être un nombre entier')
    .positive('La durée doit être positive'),
  remboursementAmount: z
    .number({
      message: 'Le montant de remboursement est requis',
    })
    .positive('Le montant doit être positif'),
  description: z.string().optional(),
  motif: z.string().min(10, 'Le motif doit contenir au moins 10 caractères'),
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
  forfaitType: undefined,
  forfaitAmount: undefined,
  remboursementType: undefined,
  remboursementDuration: undefined,
  remboursementAmount: undefined,
  description: '',
  motif: '',
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

