import { z } from 'zod'

// Énumération pour les liens de parenté
export const RelationshipEnum = z.enum([
  // Liens familiaux traditionnels
  'Père',
  'Mère', 
  'Fils',
  'Fille',
  'Frère',
  'Sœur',
  'Grand-père',
  'Grand-mère',
  'Oncle',
  'Tante',
  'Cousin',
  'Cousine',
  'Neveu',
  'Nièce',
  'Beau-père',
  'Belle-mère',
  'Beau-fils',
  'Belle-fille',
  'Beau-frère',
  'Belle-sœur',
  'Demi-frère',
  'Demi-sœur',
  'Petit-fils',
  'Petite-fille',
  'Arrière-grand-père',
  'Arrière-grand-mère',
  'Arrière-petit-fils',
  'Arrière-petite-fille',
  
  // Relations spéciales
  'Époux',
  'Épouse',
  'Conjoint',
  'Conjointe',
  'Compagnon',
  'Compagne',
  'Fiancé',
  'Fiancée',
  
  // Relations non-familiales
  'Ami',
  'Amie',
  'Parrain',
  'Marraine',
  'Filleul',
  'Filleule',
  'Famille d\'accueil',
  'Tuteur',
  'Tutrice',
  'Curateur',
  'Curatrice',
  'Collègue',
  'Voisin',
  'Voisine',
  'Autre'
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
    .optional(),
  
  // Téléphone 1 obligatoire
  phone1: z.string()
    .min(1, 'Le numéro de téléphone principal est obligatoire')
    .regex(/^(\+241|241)?[0-9]{8}$/, 'Format de téléphone invalide (ex: +241 62 34 56 78)'),
  
  // Téléphone 2 optionnel
  phone2: z.string()
    .regex(/^(\+241|241)?[0-9]{8}$/, 'Format de téléphone invalide (ex: +241 62 34 56 78)')
    .optional()
    .or(z.literal('')),
  
  // Lien de parenté obligatoire
  relationship: RelationshipEnum
})

// Valeurs par défaut
export const emergencyContactDefaultValues = {
  lastName: '',
  firstName: '',
  phone1: '',
  phone2: '',
  relationship: 'Autre' as const
}

// Type TypeScript
export type EmergencyContact = z.infer<typeof emergencyContactSchema>
export type Relationship = z.infer<typeof RelationshipEnum>
