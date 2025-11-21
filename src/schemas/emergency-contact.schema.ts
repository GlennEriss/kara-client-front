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
  lastName: '',
  firstName: '',
  phone1: '',
  phone2: '',
  relationship: 'Autre' as const,
  typeId: '',
  idNumber: '',
  documentPhotoUrl: ''
}

// Type TypeScript
export type EmergencyContact = z.infer<typeof emergencyContactSchema>
export type Relationship = z.infer<typeof RelationshipEnum>
