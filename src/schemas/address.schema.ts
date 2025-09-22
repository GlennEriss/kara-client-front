import { z } from 'zod'

// ================== STEP 2: ADRESSE ==================
export const addressSchema = z.object({
  province: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string()
      .min(2, 'La province doit contenir au moins 2 caractères')
      .max(50, 'La province ne peut pas dépasser 50 caractères')
  ),
  
  city: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string()
      .min(2, 'La ville doit contenir au moins 2 caractères')
      .max(50, 'La ville ne peut pas dépasser 50 caractères')
  ),
  
  district: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string()
      .min(2, 'Le quartier doit contenir au moins 2 caractères')
      .max(100, 'Le quartier ne peut pas dépasser 100 caractères')
  ),
  
  arrondissement: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string()
      .min(2, 'L\'arrondissement doit contenir au moins 2 caractères')
      .max(50, 'L\'arrondissement ne peut pas dépasser 50 caractères')
  ),
  
  additionalInfo: z.string()
    .max(200, 'Les informations complémentaires ne peuvent pas dépasser 200 caractères')
    .optional()
})

// ================== TYPES INFÉRÉS ==================
export type AddressFormData = z.infer<typeof addressSchema>

// ================== VALEURS PAR DÉFAUT ==================
export const addressDefaultValues: AddressFormData = {
  province: '',
  city: '',
  district: '',
  arrondissement: '',
  additionalInfo: ''
}
