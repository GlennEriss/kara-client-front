/**
 * Schemas Zod pour la validation des étapes du formulaire de demande V2
 */

import { z } from 'zod'
import { emergencyContactCISchema } from '@/schemas/caisse-imprevue.schema'

/**
 * Schema pour Step 1 : Membre + Motif
 */
export const demandStep1Schema = z.object({
  memberId: z.string().min(1, 'Le membre est requis'),
  memberFirstName: z.string().min(1, 'Le prénom est requis'),
  memberLastName: z.string().min(1, 'Le nom est requis'),
  memberEmail: z.string().email('Email invalide').optional().or(z.literal('')),
  memberContacts: z.array(z.string()).optional(),
  memberMatricule: z.string().min(1, 'Le matricule est requis'),
  memberPhone: z.string().optional(),
  cause: z
    .string()
    .min(10, 'Le motif doit contenir au moins 10 caractères')
    .max(500, 'Le motif ne peut pas dépasser 500 caractères'),
})

/**
 * Schema pour Step 2 : Forfait + Fréquence
 */
export const demandStep2Schema = z.object({
  subscriptionCIID: z.string().min(1, 'Le forfait est requis'),
  subscriptionCICode: z.string().min(1, 'Le code du forfait est requis'),
  subscriptionCILabel: z.string().optional(),
  subscriptionCIAmountPerMonth: z.number().positive('Le montant mensuel doit être positif'),
  subscriptionCINominal: z.number().positive('Le nominal doit être positif').optional(),
  subscriptionCIDuration: z.number().int().positive('La durée doit être positive'),
  subscriptionCISupportMin: z.number().min(0).optional(),
  subscriptionCISupportMax: z.number().positive().optional(),
  paymentFrequency: z.enum(['DAILY', 'MONTHLY'], {
    errorMap: () => ({ message: 'La fréquence de paiement est requise' }),
  }),
  desiredStartDate: z.string().min(1, 'La date souhaitée est requise'),
})

/**
 * Schema pour Step 3 : Contact d'urgence
 */
export const demandStep3Schema = z.object({
  emergencyContact: emergencyContactCISchema,
})

/**
 * Schema complet pour la création d'une demande
 */
export const createDemandSchema = demandStep1Schema
  .merge(demandStep2Schema)
  .merge(demandStep3Schema)

/**
 * Schema pour l'acceptation d'une demande
 */
export const acceptDemandSchema = z.object({
  reason: z
    .string()
    .min(10, 'La raison d\'acceptation doit contenir au moins 10 caractères')
    .max(500, 'La raison ne peut pas dépasser 500 caractères'),
})

/**
 * Schema pour le refus d'une demande
 */
export const rejectDemandSchema = z.object({
  reason: z
    .string()
    .min(10, 'Le motif de refus doit contenir au moins 10 caractères')
    .max(500, 'Le motif ne peut pas dépasser 500 caractères'),
})

/**
 * Schema pour la réouverture d'une demande
 */
export const reopenDemandSchema = z.object({
  reason: z.string().max(500, 'Le motif ne peut pas dépasser 500 caractères').optional(),
})

/**
 * Schema pour la mise à jour d'une demande
 */
export const updateDemandSchema = z.object({
  cause: z
    .string()
    .min(10, 'Le motif doit contenir au moins 10 caractères')
    .max(500, 'Le motif ne peut pas dépasser 500 caractères')
    .optional(),
  subscriptionCIID: z.string().min(1).optional(),
  subscriptionCICode: z.string().min(1).optional(),
  subscriptionCIAmountPerMonth: z.number().positive().optional(),
  subscriptionCIDuration: z.number().int().positive().optional(),
  paymentFrequency: z.enum(['DAILY', 'MONTHLY']).optional(),
  desiredStartDate: z.string().min(1).optional(),
  emergencyContact: emergencyContactCISchema.optional(),
})
