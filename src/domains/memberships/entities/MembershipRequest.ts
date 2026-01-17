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
export interface PaymentInfo {
  amount: number
  mode: 'AirtelMoney' | 'Mobicash' | 'Cash' | 'Virement' | 'Chèque'
  date: string
  time?: string
  withFees?: boolean
  receiptId?: string
}
