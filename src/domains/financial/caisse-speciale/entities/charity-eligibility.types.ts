/**
 * Types pour l'éligibilité aux types de caisse charitable (œuvres de charité).
 * Voir documentation/caisse-speciale/V2/check-charity-contrib/README.md
 */

export interface MemberCharitySummaryDoc {
  eligible: boolean
  lastContributionAt: unknown | null // Firestore Timestamp
  lastEventId: string | null
  lastEventName: string | null
  lastAmount: number | null
  updatedAt: unknown // Firestore Timestamp
}

export interface LastContributionInfo {
  eventId: string
  eventName: string | null
  date: Date
  amount: number | null
}

export interface MemberCharityEligibilityResult {
  eligible: boolean
  lastContribution: LastContributionInfo | null
}
