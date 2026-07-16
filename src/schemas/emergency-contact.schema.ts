import { z } from 'zod'

// Énumération pour les liens de parenté (triée par ordre alphabétique)
export const RelationshipEnum = z.enum([
  'Ami',
  'Amie',
  'Arrière-grand-mère',
  'Arrière-grand-père',
  'Arrière-petite-fille',
  'Arrière-petit-fils',
  'Autre',
  'Beau-fils',
  'Beau-frère',
  'Beau-père',
  'Belle-fille',
  'Belle-mère',
  'Belle-sœur',
  'Collègue',
  'Compagne',
  'Compagnon',
  'Conjointe',
  'Conjoint',
  'Cousin',
  'Cousine',
  'Curateur',
  'Curatrice',
  'Demi-frère',
  'Demi-sœur',
  'Épouse',
  'Époux',
  'Famille d\'accueil',
  'Fiancé',
  'Fiancée',
  'Fille',
  'Filleul',
  'Filleule',
  'Frère',
  'Grand-mère',
  'Grand-père',
  'Marraine',
  'Mère',
  'Neveu',
  'Nièce',
  'Oncle',
  'Parrain',
  'Petite-fille',
  'Petit-fils',
  'Père',
  'Sœur',
  'Tante',
  'Tutrice',
  'Tuteur',
  'Voisin',
  'Voisine'
])

// Schéma pour un contact d'urgence
export const emergencyContactSchema = z.object({
  // ID du membre si le contact d'urgence est un membre (optionnel)
  memberId: z.string().optional(),
  
  // Nom obligatoire
  lastName: z.string()
    .min(1, 'Le nom du contact d\'urgence est obligatoire')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/, 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes'),
  
  // Prénom optionnel
  firstName: z.string()
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s\-']*$/, 'Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes')
    .optional()
    .or(z.literal('')),
  
  // Téléphone 1 obligatoire
  phone1: z.string()
    .min(1, 'Le numéro de téléphone principal est obligatoire')
    .max(12, 'Le numéro de téléphone ne peut pas dépasser 12 caractères')
    .regex(/^(\+241|241)?(60|62|65|66|74|76|77)[0-9]{6}$/, 'Format de téléphone invalide. Les numéros gabonais commencent par +241 60, 62, 65, 66, 74, 76 ou 77 (ex: +241 65 34 56 78)'),
  
  // Téléphone 2 optionnel
  phone2: z.string()
    .max(12, 'Le numéro de téléphone ne peut pas dépasser 12 caractères')
    .regex(/^(\+241|241)?(60|62|65|66|74|76|77)[0-9]{6}$/, 'Format de téléphone invalide. Les numéros gabonais commencent par +241 60, 62, 65, 66, 74, 76 ou 77 (ex: +241 65 34 56 78)')
    .optional()
    .or(z.literal('')),
  
  // Lien de parenté obligatoire
  relationship: RelationshipEnum,
  
  // Type de document d'identité obligatoire
  typeId: z.string()
    .min(1, 'Le type de document est obligatoire'),
  
  // Numéro de document d'identité obligatoire
  idNumber: z.string()
    .min(1, 'Le numéro de document est obligatoire')
    .max(50, 'Le numéro de document ne peut pas dépasser 50 caractères'),
  
  // URL de la photo du document obligatoire
  documentPhotoUrl: z.string()
    .min(1, 'La photo du document est obligatoire')
    .url('L\'URL de la photo doit être valide')
})

// Valeurs par défaut
export const emergencyContactDefaultValues = {
  memberId: undefined,
  lastName: '',
  firstName: '',
  phone1: '',
  phone2: '',
  relationship: 'Autre' as const,
  typeId: '',
  idNumber: '',
  documentPhotoUrl: ''
}

// Regex pour les numéros de téléphone gabonais (avec ou sans espaces)
// Formats acceptés: +241 77 89 89 09, +24177898909, 77898909, etc.
const gabonPhoneRegex = /^(\+241\s?|241\s?)?(60|62|65|66|74|76|77)\s?[0-9]{2}\s?[0-9]{2}\s?[0-9]{2}$/

/**
 * Un contact d'urgence « inconnu » (aucune info disponible) n'a ni téléphone,
 * ni lien, ni pièce d'identité : on reconnaît ce cas au nom « INCONNU » ou au
 * compte placeholder, et on lève alors les exigences correspondantes.
 */
const UNKNOWN_CONTACT_IDS = new Set(['INCONNU', '2548.MK.290126'])
function isUnknownEmergencyContact(d: { lastName?: string; memberId?: string }): boolean {
  const lastName = (d.lastName || '').trim().toUpperCase()
  const memberId = (d.memberId || '').trim()
  return lastName === 'INCONNU' || UNKNOWN_CONTACT_IDS.has(memberId)
}

// Schéma pour un contact d'urgence Caisse Imprévue (structure différente).
// Champs de base permissifs + règles strictes appliquées via superRefine
// UNIQUEMENT lorsque le contact est renseigné (pas « inconnu »).
export const emergencyContactCISchema = z
  .object({
    // ID du membre si le contact d'urgence est un membre (optionnel)
    memberId: z.string().optional(),

    // Nom obligatoire
    lastName: z.string()
      .min(1, 'Le nom du contact d\'urgence est obligatoire')
      .max(50, 'Le nom ne peut pas dépasser 50 caractères'),

    // Prénom optionnel
    firstName: z.string()
      .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
      .optional()
      .or(z.literal('')),

    phone1: z.string(),
    phone2: z.string().optional().or(z.literal('')),
    relationship: z.string(),
    typeId: z.string(),
    idNumber: z.string().max(50, 'Le numéro de document ne peut pas dépasser 50 caractères'),
    documentPhotoUrl: z.string(),
  })
  .superRefine((d, ctx) => {
    // Contact inconnu : aucune exigence sur téléphone/lien/pièce.
    if (isUnknownEmergencyContact(d)) return

    // Contact rattaché à un MEMBRE : téléphone et pièce proviennent de sa fiche
    // déjà enregistrée → on ne réimpose PAS le format strict du numéro (les vrais
    // numéros gabonais varient : préfixe 0, opérateurs multiples, etc.).
    const isMemberLinked = !!(d.memberId && d.memberId.trim())

    if (!isMemberLinked) {
      if (!d.phone1 || d.phone1.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone1'], message: 'Le numéro de téléphone principal est obligatoire' })
      } else if (!gabonPhoneRegex.test(d.phone1)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone1'], message: 'Format de téléphone invalide. Ex: +241 77 89 89 09' })
      }
      if (d.phone2 && d.phone2.trim() && !gabonPhoneRegex.test(d.phone2)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone2'], message: 'Format de téléphone invalide. Ex: +241 77 89 89 09' })
      }
    }
    if (d.relationship.trim().length < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['relationship'], message: 'Le lien de parenté est obligatoire' })
    }
    if (d.typeId.trim().length < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['typeId'], message: 'Le type de document est obligatoire' })
    }
    if (d.idNumber.trim().length < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['idNumber'], message: 'Le numéro de document est obligatoire' })
    }
    if (d.documentPhotoUrl.trim().length < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['documentPhotoUrl'], message: 'La photo du document est obligatoire' })
    } else if (!/^https?:\/\//.test(d.documentPhotoUrl)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['documentPhotoUrl'], message: 'L\'URL de la photo doit être valide' })
    }
  })

// Type TypeScript
export type EmergencyContact = z.infer<typeof emergencyContactSchema>
export type EmergencyContactCI = z.infer<typeof emergencyContactCISchema>
export type Relationship = z.infer<typeof RelationshipEnum>
