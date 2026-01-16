/**
 * Types pour le formulaire d'inscription
 * Ré-export des types existants pour cohérence
 */

export type { RegisterFormData } from '@/types/types'
export type { MembershipRequest, MembershipRequestStatus } from '@/types/types'

/**
 * Section du formulaire d'inscription
 */
export type RegistrationFormSection = 'identity' | 'address' | 'company' | 'documents'

/**
 * Mapping des étapes vers les sections du formulaire
 */
export const STEP_TO_SECTION_MAP: Record<number, RegistrationFormSection> = {
  1: 'identity',
  2: 'address',
  3: 'company',
  4: 'documents',
} as const

/**
 * Nombre total d'étapes du formulaire
 */
export const TOTAL_STEPS = 4
