/**
 * Entités du module Membership Requests V2
 * 
 * Réutilise les types existants et ajoute des extensions spécifiques au module V2
 */

import type { 
  MembershipRequest as LegacyMembershipRequest,
  MembershipRequestStatus,
  Payment,
} from '@/types/types'

// Réutiliser le type existant
export type MembershipRequest = LegacyMembershipRequest

// Types additionnels pour le module V2
export interface MembershipRequestFilters {
  status?: MembershipRequestStatus | 'all'
  isPaid?: boolean
  search?: string
  dateFrom?: Date
  dateTo?: Date
  nationality?: string
  hasCar?: boolean
}

export interface MembershipRequestPagination {
  page: number
  limit: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface MembershipRequestsResponse {
  items: MembershipRequest[]
  pagination: MembershipRequestPagination
}

export interface MembershipStatistics {
  total: number
  byStatus: {
    pending: number
    under_review: number
    approved: number
    rejected: number
  }
  byPayment: {
    paid: number
    unpaid: number
  }
  percentages: {
    pending: number
    under_review: number
    approved: number
    rejected: number
  }
}

// PaymentInfo est réutilisé pour l'interface du repository
// Le type Payment du MembershipRequest utilise Payment[] (tableau)
import type { PaymentMode } from '@/constantes/membership-requests'

export interface PaymentInfo {
  amount: number
  mode: PaymentMode
  date: string // Date de versement (quand le client a payé - obligatoire)
  time: string // Heure de versement (obligatoire, format HH:mm)
  paymentType?: 'Membership' | 'Subscription' | 'Tontine' | 'Charity'
  withFees?: boolean // Obligatoire si mode = airtel_money ou mobicash
  paymentMethodOther?: string // Obligatoire si mode = other
  proofUrl?: string // URL de la preuve de paiement (upload image)
  proofPath?: string // Chemin Firebase Storage de la preuve
  // Traçabilité : qui a enregistré et quand (ajoutés automatiquement par le service)
  recordedBy?: string // ID de l'admin qui enregistre (ajouté par le service)
  recordedByName?: string // Nom complet de l'admin (prénom + nom) (ajouté par le service)
  recordedAt?: Date // Date d'enregistrement (quand l'admin enregistre) (ajouté par le service)
}
