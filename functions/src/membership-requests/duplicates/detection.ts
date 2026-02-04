/**
 * Détection des doublons par téléphone, email, numéro de pièce
 * Voir documentation/membership-requests/doublons/functions/README.md
 */

import * as admin from 'firebase-admin'
import { normalizePhone } from './normalize'

const db = admin.firestore()

export interface DuplicateMatches {
  byPhone: Map<string, string[]>
  byEmail: string[]
  byIdentityDoc: string[]
}

export async function findDuplicates(
  requestId: string,
  contacts: string[],
  normalizedEmail: string | null,
  normalizedDocNumber: string | null
): Promise<DuplicateMatches> {
  const collection = db.collection('membership-requests')
  const matches: DuplicateMatches = {
    byPhone: new Map(),
    byEmail: [],
    byIdentityDoc: [],
  }

  for (const phone of contacts) {
    const normalized = normalizePhone(phone)
    if (!normalized) continue
    const snapshot = await collection
      .where('identity.contacts', 'array-contains', normalized)
      .get()
    const otherIds = snapshot.docs.map((d) => d.id).filter((id) => id !== requestId)
    if (otherIds.length > 0) {
      matches.byPhone.set(normalized, otherIds)
    }
  }

  if (normalizedEmail) {
    const snapshot = await collection
      .where('normalizedEmail', '==', normalizedEmail)
      .get()
    matches.byEmail = snapshot.docs.map((d) => d.id).filter((id) => id !== requestId)
  }

  if (normalizedDocNumber) {
    const snapshot = await collection
      .where('normalizedIdentityDocNumber', '==', normalizedDocNumber)
      .get()
    matches.byIdentityDoc = snapshot.docs.map((d) => d.id).filter((id) => id !== requestId)
  }

  return matches
}
