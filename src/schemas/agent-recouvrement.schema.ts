import { z } from 'zod'

export const pieceIdentiteTypeEnum = z.enum([
  'CNI',
  'Passport',
  'Carte scolaire',
  'Carte étrangère',
  'Carte consulaire',
])

export const agentRecouvrementSexeEnum = z.enum(['M', 'F'])

export const agentRecouvrementFormSchema = z.object({
  nom: z
    .string()
    .min(1, 'Le nom est obligatoire')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/, 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes'),
  prenom: z
    .string()
    .min(1, 'Le prénom est obligatoire')
    .max(100, 'Le prénom ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/, 'Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes'),
  sexe: agentRecouvrementSexeEnum,
  pieceIdentite: z.object({
    type: pieceIdentiteTypeEnum,
    numero: z
      .string()
      .min(1, 'Le numéro de pièce est obligatoire')
      .max(50, 'Le numéro ne peut pas dépasser 50 caractères'),
    dateDelivrance: z.date({ message: 'La date de délivrance est obligatoire' }),
    dateExpiration: z.date({ message: 'La date d\'expiration est obligatoire' }),
  }),
  dateNaissance: z.date({ message: 'La date de naissance est obligatoire' }),
  lieuNaissance: z
    .string()
    .min(1, 'Le lieu de naissance est obligatoire')
    .max(100, 'Le lieu ne peut pas dépasser 100 caractères'),
  tel1: z
    .string()
    .min(1, 'Le numéro de téléphone est obligatoire')
    .max(15, 'Le numéro ne peut pas dépasser 15 caractères')
    .regex(/^(\+241|241)?[0-9\s\-]{8,15}$/, 'Format de téléphone invalide'),
  tel2: z
    .string()
    .max(15)
    .regex(/^(\+241|241)?[0-9\s\-]{8,15}$/, 'Format de téléphone invalide')
    .optional()
    .or(z.literal('')),
})
.refine(
  (data) => data.pieceIdentite.dateExpiration > data.pieceIdentite.dateDelivrance,
  { message: 'La date d\'expiration doit être après la date de délivrance', path: ['pieceIdentite', 'dateExpiration'] }
)
.refine(
  (data) => data.dateNaissance < new Date(),
  { message: 'La date de naissance doit être dans le passé', path: ['dateNaissance'] }
)

export type AgentRecouvrementFormValues = z.infer<typeof agentRecouvrementFormSchema>
