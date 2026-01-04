import { z } from 'zod'

// ================== SCHÉMA DEMANDE DE PLACEMENT ==================

export const payoutModeEnum = z.enum(['MonthlyCommission_CapitalEnd', 'CapitalPlusCommission_End'])

export const placementDemandStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CONVERTED'])

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
    .max(100, 'Le taux de commission ne peut pas dépasser 100%'),
  periodMonths: z.number()
    .min(1, 'La durée doit être d\'au moins 1 mois')
    .max(7, 'La durée ne peut pas dépasser 7 mois'),
  payoutMode: payoutModeEnum,
  desiredDate: z.string().min(1, 'La date souhaitée est requise'),
  cause: z.string()
    .max(500, 'La cause ne peut pas dépasser 500 caractères')
    .optional(),
  
  // Contact d'urgence (optionnel)
  urgentContact: z.object({
    name: z.string(),
    firstName: z.string().optional(),
    phone: z.string(),
    phone2: z.string().optional(),
    relationship: z.string().optional(),
    idNumber: z.string().optional(),
    typeId: z.string().optional(),
    documentPhotoUrl: z.string().optional(),
    memberId: z.string().optional(),
  }).optional(),
  
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
    .max(100, 'Le taux de commission ne peut pas dépasser 100%'),
  periodMonths: z.number()
    .min(1, 'La durée doit être d\'au moins 1 mois')
    .max(7, 'La durée ne peut pas dépasser 7 mois'),
  payoutMode: payoutModeEnum,
  desiredDate: z.string().min(1, 'La date souhaitée est requise'),
  cause: z.string()
    .max(500, 'La cause ne peut pas dépasser 500 caractères')
    .optional(),
  urgentContact: z.object({
    name: z.string(),
    firstName: z.string().optional(),
    phone: z.string(),
    phone2: z.string().optional(),
    relationship: z.string().optional(),
    idNumber: z.string().optional(),
    typeId: z.string().optional(),
    documentPhotoUrl: z.string().optional(),
    memberId: z.string().optional(),
  }).optional(),
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

export const placementDemandDefaultValues: Partial<PlacementDemandFormInput> = {
  payoutMode: 'MonthlyCommission_CapitalEnd',
  periodMonths: 1,
  rate: 0,
  desiredDate: new Date().toISOString().split('T')[0], // Date du jour par défaut
}

