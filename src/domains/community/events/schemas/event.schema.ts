/**
 * Schemas Zod pour la validation des formulaires d'événement
 */

import { z } from 'zod'

/**
 * Types d'événement acceptés
 */
export const eventTypeSchema = z.enum([
  'assembly',
  'celebration',
  'training',
  'charity',
  'other',
])

/**
 * Statuts d'un événement
 */
export const eventStatusSchema = z.enum([
  'draft',
  'published',
  'poll_open',
  'location_confirmed',
  'completed',
  'cancelled',
])

/**
 * Une option de lieu (pour le sondage)
 */
export const eventLocationOptionSchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .min(2, 'Le nom du lieu doit contenir au moins 2 caractères')
    .max(120, 'Le nom du lieu ne peut pas dépasser 120 caractères'),
  address: z.string().max(200).optional().or(z.literal('')),
  description: z.string().max(300).optional().or(z.literal('')),
})

/**
 * Lieu final (sans sondage, ou après clôture)
 */
export const eventFinalLocationSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(2, 'Le nom du lieu doit contenir au moins 2 caractères')
    .max(120),
  address: z.string().max(200).optional().or(z.literal('')),
  description: z.string().max(300).optional().or(z.literal('')),
})

/**
 * Step 1 : Infos générales
 */
export const eventStep1Schema = z.object({
  title: z
    .string()
    .min(3, 'Le titre doit contenir au moins 3 caractères')
    .max(120, 'Le titre ne peut pas dépasser 120 caractères'),
  description: z
    .string()
    .min(10, 'La description doit contenir au moins 10 caractères')
    .max(2000, 'La description ne peut pas dépasser 2000 caractères'),
  imageURL: z.string().url('URL invalide').optional().or(z.literal('')),
  type: eventTypeSchema.optional(),
  /** Collecte associée : l'argent reste géré par le module bienfaiteur. */
  charityEventId: z.string().optional().or(z.literal('')),
  startDate: z.string().min(1, 'La date de début est requise'),
  endDate: z.string().optional().or(z.literal('')),
})

/**
 * Step 2 : Lieu — soit un sondage avec options, soit un lieu fixe
 *
 * Validation conditionnelle via .superRefine.
 */
export const eventStep2Schema = z
  .object({
    pollEnabled: z.boolean(),
    proposedLocations: z.array(eventLocationOptionSchema).optional(),
    pollClosesAt: z.string().optional().or(z.literal('')),
    finalLocation: eventFinalLocationSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.pollEnabled) {
      if (!data.proposedLocations || data.proposedLocations.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['proposedLocations'],
          message: 'Au moins 2 options de lieu sont requises pour un sondage',
        })
      }
      if (data.proposedLocations && data.proposedLocations.length > 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['proposedLocations'],
          message: 'Pas plus de 8 options autorisées',
        })
      }
      if (!data.pollClosesAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pollClosesAt'],
          message: 'La date de clôture du sondage est requise',
        })
      }
      // Détecter doublons d'id ou de nom
      if (data.proposedLocations) {
        const ids = new Set<string>()
        const names = new Set<string>()
        for (const opt of data.proposedLocations) {
          if (ids.has(opt.id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['proposedLocations'],
              message: 'Identifiants d\'options dupliqués',
            })
          }
          ids.add(opt.id)
          const normalized = opt.name.trim().toLowerCase()
          if (names.has(normalized)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['proposedLocations'],
              message: `Le lieu "${opt.name}" est dupliqué`,
            })
          }
          names.add(normalized)
        }
      }
    } else {
      if (!data.finalLocation || !data.finalLocation.name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['finalLocation'],
          message: 'Le lieu est requis lorsqu\'il n\'y a pas de sondage',
        })
      }
    }
  })

/**
 * Versions « formulaire » des sous-schémas : champs permissifs côté Zod,
 * la validation stricte est faite conditionnellement dans superRefine
 * (selon pollEnabled). Sinon useFieldArray initialise des options vides
 * pour le sondage qui font échouer la validation alors que pollEnabled=false.
 */
const proposedLocationFormSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(120).optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
  description: z.string().max(300).optional().or(z.literal('')),
})

const finalLocationFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().max(120).optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
  description: z.string().max(300).optional().or(z.literal('')),
})

/**
 * Schema complet pour la création d'un événement
 */
export const createEventSchema = z
  .object({
    title: eventStep1Schema.shape.title,
    description: eventStep1Schema.shape.description,
    imageURL: eventStep1Schema.shape.imageURL,
    type: eventStep1Schema.shape.type,
    charityEventId: eventStep1Schema.shape.charityEventId,
    startDate: eventStep1Schema.shape.startDate,
    endDate: eventStep1Schema.shape.endDate,
    pollEnabled: z.boolean(),
    proposedLocations: z.array(proposedLocationFormSchema).optional(),
    pollClosesAt: z.string().optional().or(z.literal('')),
    finalLocation: finalLocationFormSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.pollEnabled) {
      if (!data.proposedLocations || data.proposedLocations.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['proposedLocations'],
          message: 'Au moins 2 options de lieu sont requises',
        })
      }
      // Validation stricte par option seulement quand le sondage est actif
      data.proposedLocations?.forEach((opt, idx) => {
        const name = (opt.name ?? '').trim()
        if (name.length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['proposedLocations', idx, 'name'],
            message: 'Le nom du lieu doit contenir au moins 2 caractères',
          })
        }
      })
      if (!data.pollClosesAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pollClosesAt'],
          message: 'La date de clôture du sondage est requise',
        })
      }
    } else {
      // Validation stricte du lieu fixe seulement quand pas de sondage
      const name = (data.finalLocation?.name ?? '').trim()
      if (name.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['finalLocation', 'name'],
          message: 'Le nom du lieu doit contenir au moins 2 caractères',
        })
      }
    }

    // Cohérence dates : endDate >= startDate
    if (data.endDate && data.startDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'La date de fin doit être après la date de début',
      })
    }

    // Cohérence : pollClosesAt <= startDate
    if (data.pollEnabled && data.pollClosesAt && data.startDate && data.pollClosesAt > data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pollClosesAt'],
        message: 'Le sondage doit clôturer avant le début de l\'événement',
      })
    }
  })

/**
 * Schema pour la mise à jour d'un événement (tous champs optionnels)
 */
export const updateEventSchema = z.object({
  title: eventStep1Schema.shape.title.optional(),
  description: eventStep1Schema.shape.description.optional(),
  imageURL: eventStep1Schema.shape.imageURL,
  type: eventTypeSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional().or(z.literal('')),
  pollEnabled: z.boolean().optional(),
  proposedLocations: z.array(eventLocationOptionSchema).optional(),
  pollClosesAt: z.string().optional().or(z.literal('')),
  finalLocation: eventFinalLocationSchema.optional(),
  status: eventStatusSchema.optional(),
})

/**
 * Schema pour figer le lieu gagnant
 */
export const confirmLocationSchema = z.object({
  optionId: z.string().min(1, 'Le lieu gagnant est requis'),
})

/**
 * Schema pour annuler un événement
 */
export const cancelEventSchema = z.object({
  reason: z
    .string()
    .min(10, 'La raison d\'annulation doit contenir au moins 10 caractères')
    .max(500, 'La raison ne peut pas dépasser 500 caractères'),
})

/**
 * Schema pour un vote (côté membre)
 */
export const castVoteSchema = z.object({
  memberId: z.string().min(1, 'Le membre est requis'),
  memberName: z.string().optional(),
  optionId: z.string().min(1, 'L\'option choisie est requise'),
})

// === Exports inférés ===
export type CreateEventFormValues = z.infer<typeof createEventSchema>
export type UpdateEventFormValues = z.infer<typeof updateEventSchema>
export type EventStep1Values = z.infer<typeof eventStep1Schema>
export type EventStep2Values = z.infer<typeof eventStep2Schema>
export type ConfirmLocationFormValues = z.infer<typeof confirmLocationSchema>
export type CancelEventFormValues = z.infer<typeof cancelEventSchema>
export type CastVoteFormValues = z.infer<typeof castVoteSchema>
