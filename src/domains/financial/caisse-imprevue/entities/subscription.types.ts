/**
 * Types et interfaces pour les Forfaits Caisse Imprévue
 */

/**
 * Statut d'un forfait
 */
export type SubscriptionStatus = 'ACTIVE' | 'INACTIVE'

/**
 * Interface pour un forfait Caisse Imprévue
 */
export interface SubscriptionCI {
  id: string
  label?: string
  code: string
  amountPerMonth: number
  nominal?: number
  durationInMonths: number
  penaltyRate?: number
  penaltyDelayDays?: number
  supportMin?: number
  supportMax?: number
  status: SubscriptionStatus
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

/**
 * Interface pour le contact d'urgence
 */
export interface EmergencyContactCI {
  memberId?: string // Si le contact est un membre de la mutuelle
  lastName: string
  firstName?: string
  phone1: string
  phone2?: string
  relationship: string
  idNumber: string
  typeId: string // Type de pièce d'identité (CNI, Passeport, etc.)
  documentPhotoUrl?: string // URL de la photo de la pièce d'identité
}
