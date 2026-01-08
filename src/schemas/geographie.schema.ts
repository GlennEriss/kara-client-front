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
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
})

export type ProvinceFormData = z.infer<typeof provinceSchema>

// ================== SCHÉMA DÉPARTEMENT ==================

export const departmentSchema = z.object({
  provinceId: z.string().min(1, 'La province est requise'),
  name: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  code: z
    .string()
    .max(50, 'Le code ne peut pas dépasser 50 caractères')
    .regex(/^[A-Z0-9_]*$/, 'Le code doit contenir uniquement des majuscules, chiffres et underscores')
    .optional()
    .nullable(),
})

export type DepartmentFormData = z.infer<typeof departmentSchema>

// ================== SCHÉMA COMMUNE ==================

export const communeSchema = z.object({
  departmentId: z.string().min(1, 'Le département est requis'),
  name: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  postalCode: z
    .string()
    .max(10, 'Le code postal ne peut pas dépasser 10 caractères')
    .regex(/^[A-Z0-9\s-]*$/, 'Le code postal contient des caractères invalides')
    .optional()
    .nullable(),
  alias: z
    .string()
    .max(50, 'L\'alias ne peut pas dépasser 50 caractères')
    .optional()
    .nullable(),
})

export type CommuneFormData = z.infer<typeof communeSchema>

// ================== SCHÉMA ARRONDISSEMENT ==================

export const districtSchema = z.object({
  communeId: z.string().min(1, 'La commune est requise'),
  name: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
})

export type DistrictFormData = z.infer<typeof districtSchema>

// Schéma pour création en masse d'arrondissements
export const districtBulkCreateSchema = z.object({
  communeId: z.string().min(1, 'La commune est requise'),
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
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
})

export type QuarterFormData = z.infer<typeof quarterSchema>

