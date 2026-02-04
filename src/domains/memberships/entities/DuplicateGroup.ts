/**
 * Groupe de doublons (collection duplicate-groups)
 * Voir documentation/membership-requests/doublons/README.md
 */

import type { Timestamp } from 'firebase/firestore'

export type DuplicateGroupType = 'phone' | 'email' | 'identityDocument'

export interface DuplicateGroup {
  id: string
  type: DuplicateGroupType
  value: string
  requestIds: string[]
  requestCount: number
  detectedAt: Date | Timestamp
  updatedAt: Date | Timestamp
  resolvedAt?: Date | Timestamp | null
  resolvedBy?: string | null
}
