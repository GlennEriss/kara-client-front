import { z } from 'zod'
import { RelationshipEnum } from './emergency-contact.schema'

/**
 * Bénéficiaire désigné (ayant-droit) déclaré à l'adhésion.
 *
 * Reprend la section 3 de l'engagement d'adhésion : c'est la personne à qui
 * l'allocation de secours prévue à l'Article 5 du Règlement Intérieur est
 * versée en cas de décès du membre.
 */

// Opérateurs gabonais acceptés (Libertis 60/62/66, Moov 65, Airtel 74/76/77)
const GABON_OPERATOR_CODES = ['60', '62', '65', '66', '74', '76', '77']

const trimString = (val: unknown) => (typeof val === 'string' ? val.trim() : val)

export const beneficiarySchema = z.object({
  lastName: z.preprocess(
    trimString,
    z.string("Le nom de l'ayant-droit est requis")
      .min(2, 'Le nom doit contenir au moins 2 caractères')
      .max(50, 'Le nom ne peut pas dépasser 50 caractères')
      .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets')
  ),

  firstName: z.preprocess(
    trimString,
    z.string()
      .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
      .optional()
  ).superRefine((value, ctx) => {
    if (!value || String(value).trim() === '') return
    const trimmed = String(value).trim()
    if (trimmed.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Le prénom doit contenir au moins 2 caractères',
      })
      return
    }
    if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(trimmed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Le prénom ne peut contenir que des lettres, espaces, apostrophes et tirets',
      })
    }
  }),

  // Lien de parenté avec le membre adhérent
  relationship: RelationshipEnum,

  phone: z.preprocess(
    trimString,
    z.string("Le téléphone de l'ayant-droit est requis")
      .min(1, "Le téléphone de l'ayant-droit est requis")
  ).superRefine((value, ctx) => {
    const trimmed = String(value || '').trim()
    if (!trimmed.startsWith('+241')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Le numéro doit commencer par +241' })
      return
    }
    if (trimmed.length !== 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Le numéro doit contenir exactement 12 caractères (+241 + 8 chiffres)',
      })
      return
    }
    const phoneDigits = trimmed.substring(4)
    if (!/^\d{8}$/.test(phoneDigits)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Seuls les chiffres sont autorisés après +241' })
      return
    }
    if (!GABON_OPERATOR_CODES.includes(phoneDigits.substring(0, 2))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Code opérateur invalide. Libertis (60, 62, 66), Moov (65) ou Airtel (74, 76, 77)',
      })
    }
  }),

  // N° CNI de l'ayant-droit (facultatif : tous n'en disposent pas à l'adhésion)
  idNumber: z.preprocess(
    trimString,
    z.string()
      .max(50, 'Le numéro de pièce ne peut pas dépasser 50 caractères')
      .optional()
  ),
})

export type BeneficiaryFormData = z.infer<typeof beneficiarySchema>

export const beneficiaryDefaultValues: BeneficiaryFormData = {
  lastName: '',
  firstName: '',
  relationship: 'Autre',
  phone: '',
  idNumber: '',
}
