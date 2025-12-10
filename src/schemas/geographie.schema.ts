import { z } from 'zod'

// ================== SCHÉMA PROVINCE ==================

export const provinceSchema = z.object({
  code: z
    .string()
    .min(1, 'Le code est requis')
    .max(50, 'Le code ne peut pas dépasser 50 caractères')
    .regex(/^[A-Z0-9_]+$/, 'Le code doit contenir uniquement des majuscules, chiffres et underscores'),
  name: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets'),
  displayOrder: z
    .number()
    .int('L\'ordre d\'affichage doit être un entier')
    .min(0, 'L\'ordre d\'affichage doit être positif')
    .optional()
    .nullable(),
})

export type ProvinceFormData = z.infer<typeof provinceSchema>

// ================== SCHÉMA VILLE ==================

export const citySchema = z.object({
  provinceId: z.string().min(1, 'La province est requise'),
  name: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets'),
  postalCode: z
    .string()
    .max(10, 'Le code postal ne peut pas dépasser 10 caractères')
    .regex(/^[A-Z0-9\s-]*$/, 'Le code postal contient des caractères invalides')
    .optional()
    .nullable(),
  displayOrder: z
    .number()
    .int('L\'ordre d\'affichage doit être un entier')
    .min(0, 'L\'ordre d\'affichage doit être positif')
    .optional()
    .nullable(),
})

export type CityFormData = z.infer<typeof citySchema>

// ================== SCHÉMA ARRONDISSEMENT ==================

export const districtSchema = z.object({
  cityId: z.string().min(1, 'La ville est requise'),
  name: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets'),
  displayOrder: z
    .number()
    .int('L\'ordre d\'affichage doit être un entier')
    .min(0, 'L\'ordre d\'affichage doit être positif')
    .optional()
    .nullable(),
})

export type DistrictFormData = z.infer<typeof districtSchema>

// Schéma pour création en masse d'arrondissements
export const districtBulkCreateSchema = z.object({
  cityId: z.string().min(1, 'La ville est requise'),
  count: z
    .number()
    .int('Le nombre doit être un entier')
    .min(1, 'Le nombre doit être au moins 1')
    .max(50, 'Le nombre ne peut pas dépasser 50'),
})

export type DistrictBulkCreateFormData = z.infer<typeof districtBulkCreateSchema>

// ================== SCHÉMA QUARTIER ==================

export const quarterSchema = z.object({
  districtId: z.string().min(1, 'L\'arrondissement est requis'),
  name: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets'),
  displayOrder: z
    .number()
    .int('L\'ordre d\'affichage doit être un entier')
    .min(0, 'L\'ordre d\'affichage doit être positif')
    .optional()
    .nullable(),
})

export type QuarterFormData = z.infer<typeof quarterSchema>

