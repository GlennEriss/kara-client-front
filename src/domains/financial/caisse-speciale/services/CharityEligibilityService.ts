/**
 * Service de lecture du cache member-charity-summary pour l'éligibilité aux types de caisse charitable.
 * Le cache est mis à jour par la Cloud Function syncMemberCharitySummary.
 * Voir documentation/caisse-speciale/V2/check-charity-contrib/README.md
 */

import { doc, getDoc, db } from '@/firebase/firestore'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import type { MemberCharityEligibilityResult, LastContributionInfo } from '../entities/charity-eligibility.types'

const COLLECTION = firebaseCollectionNames.memberCharitySummary

function toDate(value: unknown): Date | null {
  if (value == null) return null
  if (value instanceof Date) return value
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate()
  }
  try {
    const d = new Date(value as string | number)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

export class CharityEligibilityService {
  private static instance: CharityEligibilityService

  private constructor() {}

  static getInstance(): CharityEligibilityService {
    if (!CharityEligibilityService.instance) {
      CharityEligibilityService.instance = new CharityEligibilityService()
    }
    return CharityEligibilityService.instance
  }

  /**
   * Lit le document member-charity-summary/{memberId}.
   * Si le document n'existe pas : eligible = false, lastContribution = null.
   */
  async getMemberCharityEligibility(memberId: string): Promise<MemberCharityEligibilityResult> {
    const ref = doc(db, COLLECTION, memberId)
    const snap = await getDoc(ref)

    if (!snap.exists()) {
      return { eligible: false, lastContribution: null }
    }

    const data = snap.data()
    const eligible = Boolean(data?.eligible)
    const lastContributionAt = data?.lastContributionAt
    const lastEventId = data?.lastEventId ?? null
    const lastEventName = data?.lastEventName ?? null
    const lastAmount = typeof data?.lastAmount === 'number' ? data.lastAmount : null

    const date = toDate(lastContributionAt)
    const lastContribution: LastContributionInfo | null =
      eligible && lastEventId && date
        ? {
            eventId: lastEventId,
            eventName: lastEventName,
            date,
            amount: lastAmount,
          }
        : null

    return {
      eligible,
      lastContribution,
    }
  }
}
