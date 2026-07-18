import { z } from 'zod'
import { isEmptyEmergencyPhoneValue, isValidGabonEmergencyPhone } from './emergency-contact.schema'

// ================== SCHÉMA DEMANDE DE PLACEMENT ==================

export const payoutModeEnum = z.enum(['MonthlyCommission_CapitalEnd', 'CapitalPlusCommission_End'])

export const placementDemandStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CONVERTED'])

const placementUrgentContactSchema = z
  .object({
    name: z.string(),
    firstName: z.string().optional(),
    phone: z.string().max(30, 'Le numéro de téléphone ne peut pas dépasser 30 caractères'),
    phone2: z.string()
      .max(30, 'Le numéro de téléphone ne peut pas dépasser 30 caractères')
      .optional(),
    relationship: z.string().optional(),
    idNumber: z.string().optional(),
    typeId: z.string().optional(),
    documentPhotoUrl: z.string().optional(),
    memberId: z.string().optional(),
  })
  .superRefine((contact, ctx) => {
    if (contact.memberId?.trim()) return

    if (!isEmptyEmergencyPhoneValue(contact.phone) && !isValidGabonEmergencyPhone(contact.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: 'Format de téléphone invalide. Ex: +241 77 89 89 09',
      })
    }

    if (contact.phone2 && !isEmptyEmergencyPhoneValue(contact.phone2) && !isValidGabonEmergencyPhone(contact.phone2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone2'],
        message: 'Format de téléphone invalide. Ex: +241 77 89 89 09',
      })
    }
  })

export const placementDemandSchema = z.object({
  id: z.string().min(1, 'L\'ID de la demande est requis'),
  
  // Informations du bienfaiteur
  benefactorId: z.string().min(1, 'Le bienfaiteur est requis'),
  benefactorName: z.string().optional(),
  benefactorPhone: z.string().optional(),
  
  // Informations de la demande
  amount: z.number()
    .min(1000, 'Le montant minimum est de 1 000 FCFA')
    .max(100000000, 'Le montant maximum est de 100 000 000 FCFA'),
  rate: z.number()
    .min(0, 'Le taux de commission doit être supérieur ou égal à 0%')
    .max(10, 'Le taux de commission ne peut pas dépasser 10%'),
  periodMonths: z.number()
    .min(1, 'La durée doit être d\'au moins 1 mois')
    .max(7, 'La durée ne peut pas dépasser 7 mois'),
  payoutMode: payoutModeEnum,
  desiredDate: z.string().min(1, 'La date souhaitée est requise'),
  cause: z.string()
    .max(500, 'La cause ne peut pas dépasser 500 caractères')
    .optional(),
  
  // Contact d'urgence (optionnel)
  urgentContact: placementUrgentContactSchema.optional(),
  
  // Statut et décision
  status: placementDemandStatusEnum,
  decisionMadeAt: z.date().optional(),
  decisionMadeBy: z.string().optional(),
  decisionMadeByName: z.string().optional(),
  decisionReason: z.string().optional(),
  
  // Traçabilité de la réouverture
  reopenedAt: z.date().optional(),
  reopenedBy: z.string().optional(),
  reopenedByName: z.string().optional(),
  reopenReason: z.string().optional(),
  
  // Lien vers le placement
  placementId: z.string().optional(),
  
  // Métadonnées
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().min(1, 'L\'ID du créateur est requis'),
  updatedBy: z.string().optional(),
})

export const placementDemandFormSchema = z.object({
  benefactorId: z.string().min(1, 'Le bienfaiteur est requis'),
  amount: z.number()
    .min(1000, 'Le montant minimum est de 1 000 FCFA')
    .max(100000000, 'Le montant maximum est de 100 000 000 FCFA'),
  rate: z.number()
    .min(0, 'Le taux de commission doit être supérieur ou égal à 0%')
    .max(10, 'Le taux de commission ne peut pas dépasser 10%'),
  periodMonths: z.number()
    .min(1, 'La durée doit être d\'au moins 1 mois')
    .max(7, 'La durée ne peut pas dépasser 7 mois'),
  payoutMode: payoutModeEnum,
  desiredDate: z.string().min(1, 'La date souhaitée est requise'),
  cause: z.string()
    .max(500, 'La cause ne peut pas dépasser 500 caractères')
    .optional(),
  urgentContact: placementUrgentContactSchema.optional(),
})

export type PlacementDemandFormInput = z.infer<typeof placementDemandFormSchema>

export const approveDemandSchema = z.object({
  reason: z.string()
    .min(10, 'La raison d\'acceptation doit contenir au moins 10 caractères')
    .max(500, 'La raison ne peut pas dépasser 500 caractères'),
})

export const rejectDemandSchema = z.object({
  reason: z.string()
    .min(10, 'La raison du refus doit contenir au moins 10 caractères')
    .max(500, 'La raison ne peut pas dépasser 500 caractères'),
})

export const reopenDemandSchema = z.object({
  reason: z.string()
    .min(10, 'Le motif de réouverture doit contenir au moins 10 caractères')
    .max(500, 'Le motif ne peut pas dépasser 500 caractères'),
})

export const convertDemandToPlacementSchema = z.object({
  paymentMode: z.enum(['airtel_money', 'mobicash', 'cash', 'bank_transfer', 'other']),
  withFees: z.boolean().optional(),
  paymentMethodOther: z.string().optional(),
  handoverLocation: z.string().trim().min(2, 'Le lieu de remise est requis'),
  handoverDate: z.string().min(1, 'La date de remise est requise'),
  handoverTime: z
    .string()
    .min(1, "L'heure de remise est requise")
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Format d'heure invalide (HH:mm)"),
}).superRefine((data, ctx) => {
  const isMobileMoney = data.paymentMode === 'airtel_money' || data.paymentMode === 'mobicash'

  if (isMobileMoney && !(data.withFees === true || data.withFees === false)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Veuillez indiquer si le paiement est avec ou sans frais',
      path: ['withFees'],
    })
  }

  if (data.paymentMode === 'other' && !data.paymentMethodOther?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Veuillez préciser le moyen de paiement',
      path: ['paymentMethodOther'],
    })
  }
})

export type ConvertDemandToPlacementInput = z.infer<typeof convertDemandToPlacementSchema>

export const placementDemandDefaultValues: Partial<PlacementDemandFormInput> = {
  // Tous les champs texte sont initialisés : un champ absent rend son input
  // non contrôlé, puis contrôlé à la première saisie (warning React).
  benefactorId: '',
  cause: '',
  payoutMode: 'MonthlyCommission_CapitalEnd',
  periodMonths: 1,
  rate: 0,
  desiredDate: new Date().toISOString().split('T')[0], // Date du jour par défaut
}
