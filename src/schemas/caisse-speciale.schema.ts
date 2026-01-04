import { z } from 'zod'

// ================== SCHÉMA DEMANDE DE CAISSE SPÉCIALE ==================

export const caisseTypeEnum = z.enum(['STANDARD', 'JOURNALIERE', 'LIBRE'])

export const caisseSpecialeDemandStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CONVERTED'])

export const caisseSpecialeDemandSchema = z.object({
  id: z.string().min(1, 'L\'ID de la demande est requis'),
  
  // Informations du demandeur
  memberId: z.string().min(1, 'Le membre est requis'),
  contractType: z.literal('INDIVIDUAL'),
  
  // Informations de la demande
  caisseType: caisseTypeEnum,
  monthlyAmount: z.number()
    .min(1000, 'Le montant mensuel minimum est de 1 000 FCFA')
    .max(10000000, 'Le montant mensuel maximum est de 10 000 000 FCFA'),
  monthsPlanned: z.number()
    .min(1, 'La durée doit être d\'au moins 1 mois')
    .max(120, 'La durée ne peut pas dépasser 120 mois'),
  desiredDate: z.string().min(1, 'La date souhaitée est requise'),
  cause: z.string()
    .max(500, 'La cause ne peut pas dépasser 500 caractères')
    .optional(),
  
  // Statut et décision
  status: caisseSpecialeDemandStatusEnum,
  decisionMadeAt: z.date().optional(),
  decisionMadeBy: z.string().optional(),
  decisionMadeByName: z.string().optional(),
  decisionReason: z.string().optional(),
  
  // Traçabilité de la réouverture
  reopenedAt: z.date().optional(),
  reopenedBy: z.string().optional(),
  reopenedByName: z.string().optional(),
  reopenReason: z.string().optional(),
  
  // Lien vers le contrat
  contractId: z.string().optional(),
  
  // Métadonnées
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().min(1, 'L\'ID du créateur est requis'),
  updatedBy: z.string().optional(),
})

export const caisseSpecialeDemandFormSchema = z.object({
  memberId: z.string().min(1, 'Le membre est requis'),
  caisseType: caisseTypeEnum,
  monthlyAmount: z.number()
    .min(1000, 'Le montant mensuel minimum est de 1 000 FCFA')
    .max(10000000, 'Le montant mensuel maximum est de 10 000 000 FCFA'),
  monthsPlanned: z.number()
    .min(1, 'La durée doit être d\'au moins 1 mois')
    .max(120, 'La durée ne peut pas dépasser 120 mois'),
  desiredDate: z.string().min(1, 'La date souhaitée est requise'),
  cause: z.string()
    .max(500, 'La cause ne peut pas dépasser 500 caractères')
    .optional(),
})

export type CaisseSpecialeDemandFormInput = z.infer<typeof caisseSpecialeDemandFormSchema>

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

export const caisseSpecialeDemandDefaultValues: Partial<CaisseSpecialeDemandFormInput> = {
  caisseType: 'STANDARD',
  monthsPlanned: 12,
  desiredDate: new Date().toISOString().split('T')[0], // Date du jour par défaut
}

